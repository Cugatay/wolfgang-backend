/* eslint-disable no-await-in-loop */
/* eslint-disable no-use-before-define */
/* eslint-disable no-param-reassign */
import { Document } from 'mongoose';
import GameModel, { IGame } from '../models/GameModel';

// const DAY_SECONDS = 60;
// const VOTE_SECONDS = 15;
// const NIGHT_SECONDS = 30;

const DAY_SECONDS = 5;
const VOTE_SECONDS = 5;
const NIGHT_SECONDS = 5;
const WAIT_SECONDS = 5;

const startGame = (game: IGame & Document<any, any, IGame>) => {
  const { players } = game;

  const roles = ['seer', 'doctor', 'vampire', 'vampire', 'villager', 'villager', 'villager', 'villager', 'villager'];

  const shuffleArray = <T>(array: Array<T>) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  };

  shuffleArray(roles);

  for (let i = 0; players[i] !== undefined; i++) {
    const player = players[i];
    player.role = roles[i];
  }

  game.save();

  const getUpdatedGame = async () => {
    const updatedGame = await GameModel.findById(game._id);
    return updatedGame;
  };

  // Day -> 1 min
  // Vote -> 15 sec
  // Night -> 30 sec
  // + _____________
  //      105 sec

  const winFunc = (pGame: IGame & Document<any, any, IGame>) => {
    const vampires = [];
    const villagers = [];

    for (let i = 0; pGame.players[i] !== undefined; i++) {
      const player = pGame.players[i];

      if (player.isAlive) {
        if (player.role === 'vampire') {
          vampires.push(player);
        } else {
          villagers.push(player);
        }
      }
    }

    console.log('alive vampires:');
    console.log(vampires);
    console.log('00000000000000');
    console.log('villagers');
    console.log(villagers);
    if (vampires.length === 0) {
      console.log('Vampirler ölmüş la');
      pGame.winner = 'villagers';
    } else if (villagers.length <= vampires.length) {
      console.log('Vampirler kazanmış bro');
      pGame.winner = 'vampires';
    }

    if (pGame.winner) {
      console.log('Game has finished');
      pGame.save();
      clearInterval(dayLoop);
      return true;
    }

    return false;
  };

  const dayFunc = async () => {
    const updatedGame = await getUpdatedGame();

    console.log('day time');

    updatedGame!.shownRole = null;
    updatedGame!.time = 'day';

    let votedUser = updatedGame!.players.find((pl) => pl.isAlive);

    for (let i = 1; updatedGame!.players[i] !== undefined; i++) {
      const pl = updatedGame!.players[i];
      if (pl.isAlive && pl.votes.length > 0) {
        if (pl.votes.length > votedUser!.votes.length) {
          votedUser = pl;
        } else if (pl.votes.length === votedUser!.votes.length) {
          const randomNumber = Math.floor(Math.random() * 2);
          if (randomNumber) {
            votedUser = pl;
          }
        }
      }
    }

    if (votedUser!.votes.length > 0 && !votedUser?.isProtected) {
      votedUser!.isAlive = false;
    }

    for (let i = 0; updatedGame!.players[i] !== undefined; i++) {
      const pl = updatedGame!.players[i];
      pl.votes = [];
      pl.isProtected = false;
    }

    const isGameFinished = winFunc(updatedGame!);
    if (isGameFinished) return;

    updatedGame!.save();
  };

  const voteFunc = async () => {
    const updatedGame = await getUpdatedGame();

    const isGameFinished = winFunc(updatedGame!);
    if (isGameFinished) return;

    updatedGame!.time = 'vote';
    updatedGame!.save();

    console.log('vote time');
  };

  const nightFunc = async () => {
    const updatedGame = await getUpdatedGame();

    console.log('night time');

    updatedGame!.time = 'night';

    let votedUser = updatedGame!.players.find((pl) => pl.isAlive);

    for (let i = 1; updatedGame!.players[i] !== undefined; i++) {
      const pl = updatedGame!.players[i];
      if (pl.isAlive && pl.votes.length > 0) {
        if (pl.votes.length > votedUser!.votes.length) {
          votedUser = pl;
        } else if (pl.votes.length === votedUser!.votes.length) {
          const randomNumber = Math.floor(Math.random() * 2);
          if (randomNumber) {
            votedUser = pl;
          }
        }
      }
    }

    // if (votedUser!.votes.length > Math.floor(updatedGame!.players.length)) {
    if (votedUser!.votes.length > 0 && !votedUser?.isProtected) {
      votedUser!.isAlive = false;
    }

    for (let i = 0; updatedGame!.players[i] !== undefined; i++) {
      const pl = updatedGame!.players[i];
      pl.votes = [];
    }

    const isGameFinished = winFunc(updatedGame!);
    if (isGameFinished) return;

    updatedGame!.save();
  };

  const dayLoopFunction = async () => {
    nightFunc();

    console.log('loop restart');

    setTimeout(async () => {
      dayFunc();

      setTimeout(async () => {
        voteFunc();
      }, DAY_SECONDS * 1000);
    }, NIGHT_SECONDS * 1000);
  };

  // eslint-disable-next-line no-undef
  let dayLoop: NodeJS.Timeout;

  setTimeout(() => {
    dayLoop = setInterval(dayLoopFunction, (DAY_SECONDS + VOTE_SECONDS + NIGHT_SECONDS) * 1000);
    dayLoopFunction();
  }, WAIT_SECONDS * 1000);
};

export default startGame;
