import { Schema, model, ObjectId } from 'mongoose';

type Roles = 'villager' | 'seer' | 'doctor' | 'vampire';

interface Player {
    user_id: ObjectId;
    winner: null | Roles;
    role: Roles;
}

export interface IGame {
    players: Player[];
    winner: null | string;
}

const schema = new Schema<IGame>({
  players: [{ user_id: String, winner: String }],
  winner: String,
});

const GameModel = model<IGame>('Game', schema);

export default GameModel;
