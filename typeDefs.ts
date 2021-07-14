const { gql } = require('apollo-server');

const typeDefs = gql`
  type Query {
    hello: String
  }

  type Mutation {
    register(username: String!, password: String!, email: String!): String!
    login(username: String!, password: String!): String!
    changeAvatar(token: String!, avatar: Int!): String!
  }
`;

export default typeDefs;
