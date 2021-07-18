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
    // deneme: (_: null, __: null, { pubsub: pubb }: IContext) => {
    //   pubb.publish('GAME_UPDATED',
    // { game_id: '12345', gameUpdated: ['Cagatay', 'ali', 'falan'] });
    //   return 'success';
    // },
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

      pubsub.publish('GAME_UPDATED', { gameUpdated: game });

      if (game.players.length === 9) {
        startGame(game!);
      }

      return game;
    },
    // Users can vote itselves

    voteToKill: async (_: null,
      { token, targetUsername }: ActionProps, { GameModel }: IContext) => {
      const user = await verifyUser(token);

      const game = await GameModel.findOne({
        players: { $elemMatch: { username: user.username, isAlive: true } },
        winner: null,
      });

      if (!game) throw new Error('You are not in a game');

      if (game.time !== 'night') throw new Error("You can't to this right now");

      const player = game.players.find((pl) => pl.username === user.username);

      if (player?.role !== 'vampire') throw new Error('You are not a Vampire');
      if (!player.isAlive) throw new Error('You are dead');

      const targetUser = game.players.find((pl) => pl.username === targetUsername);

      if (!targetUser) throw new Error('This user is not in this game');

      if (!targetUser.isAlive) throw new Error('This user is already dead');

      const existVote = game.players.find((pl) => {
        const voteIndex = pl.votes.indexOf(user.username);
        if (voteIndex !== -1) {
          pl.votes.splice(voteIndex, 1);
        }

        return voteIndex !== -1;
      });

      if (existVote?.username !== targetUsername) {
        targetUser.votes.push(user.username);
      }

      game.save();
      return targetUsername;
    },
    voteToExecute: async (_: null,
      { token, targetUsername }: ActionProps, { GameModel }: IContext) => {
      const user = await verifyUser(token);

      const game = await GameModel.findOne({
        players: { $elemMatch: { username: user.username, isAlive: true } },
        winner: null,
      });

      if (!game) throw new Error('You are not in a game');

      if (game.time !== 'vote') throw new Error("You can't to this right now");

      const player = game.players.find((pl) => pl.username === user.username);
      if (!player!.isAlive) throw new Error('You are dead');

      const targetUser = game.players.find((pl) => pl.username === targetUsername);

      if (!targetUser) throw new Error('This user is not in this game');

      if (!targetUser.isAlive) throw new Error('This user is already dead');

      const existVote = game.players.find((pl) => {
        const voteIndex = pl.votes.indexOf(user.username);
        if (voteIndex !== -1) {
          pl.votes.splice(voteIndex, 1);
        }

        return voteIndex !== -1;
      });

      if (existVote?.username !== targetUsername) {
        targetUser.votes.push(user.username);
      }

      game.save();
      return targetUsername;
    },
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
  },
  Subscription: {
    gameUpdated: {
      subscribe: withFilter(() => pubsub.asyncIterator('GAME_UPDATED'), async (payload, variables) => {
        const user = await verifyUser(variables.token);

        const game = await SubGameModel.findOne({
          players: { $elemMatch: { username: user.username, isAlive: true } },
          winner: null,
        });
        console.log(payload.gameUpdated);
        console.log(variables.token);
        console.log(game);

        return payload.gameUpdated._id.toString() === game?._id.toString();
        // return !!game;
      }),
    },
  },
};

export default resolvers;
