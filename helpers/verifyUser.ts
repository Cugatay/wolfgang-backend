import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import UserModel from '../models/UserModel';

const verifyUser = async (token: string, comingUsername?: string, comingPassword?: string) => {
  let username;
  let password;

  if (token) {
    const {
      username: tokenUsername,
      password: tokenPassword,
    }: any = await jwt.verify(token, process.env.SECRET_KEY!);

    username = tokenUsername;
    password = tokenPassword;
  } else {
    username = comingUsername;
    password = comingPassword;
  }

  const user = await UserModel.findOne({ username });
  if (!user) throw new Error('Username or password is not valid');

  const isPasswordValid = await bcrypt.compare(password, user?.password);
  if (!isPasswordValid) throw new Error('Username or password is not valid');

  return user;
};

export default verifyUser;
