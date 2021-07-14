/* eslint-disable no-console */
import { ApolloServer } from 'apollo-server';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from './models/UserModel';
import GameModel from './models/GameModel';
import resolvers from './resolvers';
import typeDefs from './typeDefs';

dotenv.config();

const PORT = 5000;

export interface IContext {
  UserModel: typeof UserModel;
  GameModel: typeof GameModel;
}

const context: IContext = {
  UserModel,
  GameModel,
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
  plugins: [
    ApolloServerPluginLandingPageGraphQLPlayground(),
  ],
});

mongoose.connect(process.env.MONGO_DB!, (err) => {
  if (err) throw err;

  console.log('MongoDB connected successfully');
});

server.listen(PORT).then(() => {
  console.log(`🚀 Server ready at ${PORT}`);
});
