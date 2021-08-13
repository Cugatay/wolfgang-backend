import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { withFilter } from 'graphql-subscriptions';
import startGame from './helpers/startGame';
import { IContext, pubsub } from '.';
import { IUser } from './models/UserModel';
import verifyUser from './helpers/verifyUser';
import SubGameModel from './models/GameModel';
// import { withFilter } from 'graphql-subscriptions';

interface ActionProps {
  token: string;
  targetUsername: string;
}

const resolvers = {
  Query: {
    // Users can vote itselves
    mainScreen: async (_: null, { token }: IUser) => {
      const user = await verifyUser(token);
      if (!user) throw new Error('Please Sign In');

      console.log(user.username);

      return user;
    },
    myRole: async (_: null, { token }: IUser, { GameModel }: IContext) => {
      const user = await verifyUser(token);

      const gameOfUser = await GameModel.findOne({
        players: { $elemMatch: { username: user.username, isAlive: true } },
        winner: null,
      });

      if (!gameOfUser) throw new Error('You are not in a game');

      const player = gameOfUser.players.find((pl) => pl.username === user.username);

      if (!player?.role) throw new Error('Your role is not explicit yet');

      if (player.role === 'vampire') {
        const otherVampire = gameOfUser.players.find((pl) => pl.username !== user.username && pl.role === 'vampire');

        return {
          role: player.role,
          otherVampire: otherVampire?.username,
        };
      }

      return {
        role: player.role,
      };
    },
  },
  Mutation: {
    joinGame: async (_: null, { token }: IUser, { GameModel }: IContext) => {
      const user = await verifyUser(token);

      let game = await GameModel.findOne({ 'players.8': { $exists: false } });

      if (!game) {
        const newGame = new GameModel({});

        game = newGame;
      }

      const alreadyInGame = await GameModel.findOne({
        // players: [{ username: user.username, isAlive: true }],
        players: { $elemMatch: { username: user.username, isAlive: true } },
        // 'players.isAlive': true,
        winner: null,
      });

      if (alreadyInGame) throw new Error('You are already in a game');

      game.players.push({
        username: user.username,
        role: null,
        votes: [],
        isAlive: true,
        isProtected: false,
      });

      await game.save();

      if (game.players.length === 5) {
        startGame(game!);
      }

      pubsub.publish('GAME_UPDATED', { gameUpdated: game });

      return game;
    },
    register: async (_: null, { username, password, email }: IUser, { UserModel }: IContext) => {
      const existUser = await UserModel.findOne({ username });

      if (existUser) throw new Error('Username is in use');

      const passwordHash = await bcrypt.hash(password, 13);

      const user = new UserModel({
        username,
        password: passwordHash,
        email,
        avatar: 0,
        winCount: 0,
      });

      await user.save();

      const token = jwt.sign({ username, password }, process.env.SECRET_KEY!);

      return token;
    },
    login: async (_: null, { username, password }: IUser, { UserModel }: IContext) => {
      const user = await UserModel.findOne({ username });
      if (!user) throw new Error('Username or password is not valid');

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) throw new Error('Username or password is not valid');

      const token = jwt.sign({ username, password }, process.env.SECRET_KEY!);
      return token;
    },
    changeAvatar: async (_: null, { token, avatar }: IUser) => {
      const user = await verifyUser(token);
      user.avatar = avatar;

      user.save();

      return 'success';
    },
    vote: async (_: null,
      { token, targetUsername }: ActionProps, { GameModel }: IContext) => {
      const user = await verifyUser(token);

      const game = await GameModel.findOne({
        players: { $elemMatch: { username: user.username, isAlive: true } },
        winner: null,
      });
      if (!game) throw new Error('You are not in a game');

      const player = game.players.find((pl) => pl.username === user.username);
      const targetUser = game.players.find((pl) => pl.username === targetUsername);

      if (!player?.isAlive) throw new Error('You are dead');
      if (!targetUser) throw new Error('This user is not in this game');
      if (!targetUser.isAlive) throw new Error('This user is already dead');
      if (!(game.time === 'night' && player.role === 'vampire') && game.time !== 'vote') throw new Error("You can't to this right now");

      const existVote = game.players.find((pl) => {
        const voteIndex = pl.votes.indexOf(user.username);
        if (voteIndex !== -1) {
          pl.votes.splice(voteIndex, 1);
        }

        return voteIndex !== -1;
      });

      console.log('now here');
      console.log(existVote);
      if (existVote?.username !== targetUsername) {
        console.log('yey');
        targetUser.votes.push(user.username);
      }

      pubsub.publish('PLAYER_VOTED', { playerVoted: { game_id: game._id, player_username: user.username, target_username: existVote?.username !== targetUsername ? targetUsername : null } });

      game.save();
      return targetUsername;
    },
    // voteToExecute: async (_: null,
    //   { token, targetUsername }: ActionProps, { GameModel }: IContext) => {
    //   const user = await verifyUser(token);

    //   const game = await GameModel.findOne({
    //     players: { $elemMatch: { username: user.username, isAlive: true } },
    //     winner: null,
    //   });

    //   if (!game) throw new Error('You are not in a game');

    //   if (game.time !== 'vote') throw new Error("You can't to this right now");

    //   const player = game.players.find((pl) => pl.username === user.username);
    //   if (!player!.isAlive) throw new Error('You are dead');

    //   const targetUser = game.players.find((pl) => pl.username === targetUsername);

    //   if (!targetUser) throw new Error('This user is not in this game');

    //   if (!targetUser.isAlive) throw new Error('This user is already dead');

    //   const existVote = game.players.find((pl) => {
    //     const voteIndex = pl.votes.indexOf(user.username);
    //     if (voteIndex !== -1) {
    //       pl.votes.splice(voteIndex, 1);
    //     }

    //     return voteIndex !== -1;
    //   });

    //   if (existVote?.username !== targetUsername) {
    //     targetUser.votes.push(user.username);
    //   }

    //   pubsub.publish('PLAYER_VOTED_TO_EXECUTE', { playerVotedToExecute: { game_id:
    //  game._id, player_username: user.username, target_usern
    // ame: existVote?.username !== targetUsername ? targetUsername : null } });

    //   game.save();
    //   return targetUsername;
    // },
    protectUser: async (_: null,
      { token, targetUsername }: ActionProps, { GameModel }: IContext) => {
      const user = await verifyUser(token);

      const game = await GameModel.findOne({
        players: { $elemMatch: { username: user.username, isAlive: true } },
        winner: null,
      });

      if (!game) throw new Error('You are not in a game');

      if (game.time !== 'night') throw new Error("You can't to this right now");

      const player = game.players.find((pl) => pl.username === user.username);
      if (!player!.isAlive) throw new Error('You are dead');
      if (player!.role !== 'doctor') throw new Error('Your role is not doctor');

      const targetUser = game.players.find((pl) => pl.username === targetUsername);

      if (!targetUser) throw new Error('This user is not in this game');

      if (!targetUser.isAlive) throw new Error('This user is already dead');

      const alreadyProtectedUser = game.players.find((pl) => pl.isProtected);

      if (alreadyProtectedUser) {
        alreadyProtectedUser.isProtected = false;
      }

      if (targetUsername !== alreadyProtectedUser?.username) {
        targetUser.isProtected = true;
      }

      game.save();

      return 'success';
    },
    showRole: async (_: null,
      { token, targetUsername }: ActionProps, { GameModel }: IContext) => {
      const user = await verifyUser(token);

      const game = await GameModel.findOne({
        players: { $elemMatch: { username: user.username, isAlive: true } },
        winner: null,
      });

      if (!game) throw new Error('You are not in a game');

      if (game.time !== 'night') throw new Error("You can't to this right now");

      const player = game.players.find((pl) => pl.username === user.username);
      if (!player!.isAlive) throw new Error('You are dead');
      if (player!.role !== 'seer') throw new Error('Your role is not seer');

      const targetUser = game.players.find((pl) => pl.username === targetUsername);

      if (!targetUser) throw new Error('This user is not in this game');

      if (targetUser.username === user.username) throw new Error("You can't search for your role");

      if (!targetUser.isAlive) throw new Error('This user is already dead');

      if (game.shownRole) throw new Error('You already searched for a role');

      return {
        username: targetUser.username,
        role: targetUser.role,
      };
    },
    sendMessage: async (_: null,
      { token, message: pMessage }: {token: string, message: string}, { GameModel }: IContext) => {
      const user = await verifyUser(token);

      const game = await GameModel.findOne({
        players: { $elemMatch: { username: user.username, isAlive: true } },
        winner: null,
      });

      if (!game) throw new Error('You are not in a game');

      const player = game.players.find((pl) => pl.username === user.username);
      if (!player!.isAlive) throw new Error('You are dead');

      const message = pMessage.trim();

      const chat = game.time === 'day' || game.time === 'vote' ? 'village' : game.time === 'night' && player?.role === 'vampire' ? 'vampire' : null;

      if (chat) {
        pubsub.publish('PLAYER_SENT_MESSAGE', {
          game_id: game._id,
          playerSentMessage: {
            username: user.username,
            message,
            chat,
          },
        });
      } else {
        throw new Error("You can't send message now");
      }

      return 'success';
    },
  },
  Subscription: {
    gameUpdated: {
      subscribe: withFilter(() => pubsub.asyncIterator('GAME_UPDATED'), async (payload, variables) => {
        const user = await verifyUser(variables.token);

        const game = await SubGameModel.findOne({
          players: { $elemMatch: { username: user.username /* , isAlive: true */ } },
          // winner: null,
        }, {}, { sort: { createdAt: -1 } });

        return payload.gameUpdated._id.toString() === game?._id.toString();
      }),
    },
    playerVoted: {
      subscribe: withFilter(() => pubsub.asyncIterator('PLAYER_VOTED'), async (payload, variables) => {
        const user = await verifyUser(variables.token);

        const game = await SubGameModel.findOne({
          players: { $elemMatch: { username: user.username, isAlive: true } },
          winner: null,
        });

        const vampire = game?.players.find((pl) => pl.username === user.username && pl.role === 'vampire');

        if (game?.time === 'vote') {
          return payload.playerVoted.game_id.toString() === game?._id.toString();
          // && payload.playerVoted.player_username !== user.username;
        }

        return payload.playerVoted.game_id.toString() === game?._id.toString()
        // && payload.playerVoted.player_username !== user.username
        && vampire !== undefined;
      }),
    },
    // playerVotedToKill: {
    //   subscribe: withFilter(() => pubsub.a
    // syncIterator('PLAYER_VOTED_TO_KILL'), async (payload, variables) => {
    //     const user = await verifyUser(variables.token);

    //     const game = await SubGameModel.findOne({
    //       players: { $elemMatch: { username: user.username, isAlive: true } },
    //       winner: null,
    //     });

    //     const player = game?.players.fin
    // d((pl) => pl.username === user.username && pl.role === 'vampire');

    //     return !!player && payload.playerVotedToKill.game_id.toString() === game?._id.toString()
    //     && payload.playerVotedToKill.player_username !== user.username;
    //   }),
    // },
    playerSentMessage: {
      subscribe: withFilter(() => pubsub.asyncIterator('PLAYER_SENT_MESSAGE'), async (payload, variables) => {
        const user = await verifyUser(variables.token);

        const game = await SubGameModel.findOne({
          players: { $elemMatch: { username: user.username /* isAlive: true */ } },
          winner: null,
        }, {}, { sort: { createdAt: -1 } });

        const player = game?.players.find((pl) => pl.username === user.username && pl.role === 'vampire');

        if (payload.playerSentMessage.chat === 'village') {
          return payload.game_id.toString() === game?._id.toString()
          && payload.playerSentMessage.username !== user.username;
        }

        console.log(player);
        return payload.game_id.toString() === game?._id.toString()
          && payload.playerSentMessage.username !== user.username
        && player?.role === 'vampire';
      }),
    },
    // playerSentVampireMessage: {
    //   subscribe: withFilter(() => pubsub.asyncIterator
    // ('PLAYER_SENT_VAMPIRE_MESSAGE'), async (payload, variables) => {
    //     const user = await verifyUser(variables.token);

    //     const game = await SubGameModel.findOne({
    //       players: { $elemMatch: { username: user.username, isAlive: true } },
    //       winner: null,
    //     });

    //     const player = game?.players.find((pl) => pl.us
    // ername === user.username && pl.role === 'vampire');

    //     return payload.game_id.toString() === game?._id.toString()
    //     && payload.playerSentVampireMessage.username !== user.username
    //     && player?.role === 'vampire';
    //   }),
    // },
  },
};

export default resolvers;
