// /* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import express from 'express';
import { execute, subscribe } from 'graphql';
import { ApolloServer } from 'apollo-server-express';
import { PubSub } from 'graphql-subscriptions';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import typeDefs from './typeDefs';
import resolvers from './resolvers';
import GameModel from './models/GameModel';
import UserModel from './models/UserModel';

dotenv.config();

export interface IContext {
  UserModel: typeof UserModel;
  GameModel: typeof GameModel;
  pubsub: PubSub;
}
export const pubsub = new PubSub();

(async () => {
  const PORT = 5000;
  const app = express();
  const httpServer = createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const context: IContext = {
    UserModel,
    GameModel,
    pubsub,
  };

  mongoose.connect(process.env.MONGO_DB!, (err) => {
    if (err) throw err;

    console.log('MongoDB connected successfully');
  });

  const server = new ApolloServer({
    schema,
    context,
    plugins: [
      ApolloServerPluginLandingPageGraphQLPlayground(),
    ],
  });
  await server.start();
  server.applyMiddleware({ app });

  SubscriptionServer.create(
    {
      schema, execute, subscribe,
    },
    { server: httpServer, path: server.graphqlPath },
  );

  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Query endpoint ready at http://localhost:${PORT}${server.graphqlPath}`,
    );
    console.log(
      `🚀 Subscription endpoint ready at ws://localhost:${PORT}${server.graphqlPath}`,
    );
  });
})();
