import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IContext } from '.';
import { IUser } from './models/UserModel';
import verifyUser from './helpers/verifyUser';

const resolvers = {
  Query: {
    hello: () => 'Helloooooooooooo',
  },
  Mutation: {
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
  },
};

export default resolvers;
