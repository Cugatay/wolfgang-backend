import { Schema, model } from 'mongoose';

export interface IUser {
    username: string;
    password: string;
    email: string;
    avatar: number;
    winCount: number;
    token: string;
}

const schema = new Schema<IUser>({
  username: String,
  password: String,
  email: String,
  avatar: Number,
  winCount: Number,
});

const UserModel = model<IUser>('User', schema);

export default UserModel;
