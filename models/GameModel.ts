import { Schema, model } from 'mongoose';

// type Roles = 'villager' | 'seer' | 'doctor' | 'vampire';
type GameTimes = 'day' | 'vote' | 'night' | 'roleSelect';
interface Player {
    username: string;
    role: string | null;
    votes: string[];
    isAlive: boolean;
    isProtected: boolean;
}

export interface IGame {
    players: Player[];
    winner: null | 'villagers' | 'vampires';
    time: null | GameTimes;
    shownRole: string | null;
}

const schema = new Schema<IGame>({
  players: [{
    username: String,
    role: String,
    votes: [String],
    isAlive: Boolean,
    isProtected: Boolean,
  }],
  winner: String,
  time: String,
  shownRole: String,
}, { timestamps: true });

const GameModel = model<IGame>('Game', schema);

export default GameModel;
