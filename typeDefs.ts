const { gql } = require('apollo-server');

const typeDefs = gql`
  type Game {
    # _id: String!
    players: [Player!]!
    winner: String
    time: String # Day, Vote, Night - or if the game is not started yet, it's null
  }

  type Player {
    username: String!
    isAlive: Boolean
  }

  type RoleRes {
    role: String!
    otherVampire: String
  }

  type ShownRoleRes {
    username: String!
    role: String!
  }

  type Query {
    myRole(token: String!): RoleRes! 
  }

  type Mutation {
    deneme: String
    register(username: String!, password: String!, email: String!): String!
    login(username: String!, password: String!): String!
    changeAvatar(token: String!, avatar: Int!): String!
    joinGame(token: String!): Game!
    voteToKill(token: String!, targetUsername: String!): String!
    voteToExecute(token: String!, targetUsername: String!): String!
    protectUser(token: String!, targetUsername: String!): String!
    showRole(token: String!, targetUsername: String!): ShownRoleRes!
  }

  type Subscription {
    gameUpdated(token: String!): Game!
    # playerJoined: Player!
    # playerDied: Player!
    # gameStarted: Game!
    # gameFinished: Game!
  }
`;

export default typeDefs;
