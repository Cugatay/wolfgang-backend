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
    avatar: Int!
    isAlive: Boolean
  }

  type RoleRes {
    role: String!
    otherVampire: String
  }

  type MainScreenRes {
    winCount: Int!
    avatar: Int!
    username: String!
  }

  type ShownRoleRes {
    username: String!
    role: String!
  }

  type PlayerExecuteRes {
    player_username: String!
    target_username: String
  }

  type Message {
    username: String!
    message: String!
    chat: String!
  }

  type Query {
    myRole(token: String!): RoleRes! 
    mainScreen(token: String!): MainScreenRes!
  }

  type Mutation {
    joinGame(token: String!): Game!
    register(username: String!, password: String!, email: String!): String!
    login(username: String!, password: String!): String!
    changeAvatar(token: String!, avatar: Int!): String!
    vote(token: String!, targetUsername: String!): String!
    # voteToExecute(token: String!, targetUsername: String!): String!
    protectUser(token: String!, targetUsername: String!): String!
    showRole(token: String!, targetUsername: String!): ShownRoleRes!
    sendMessage(token: String!, message: String!): String!
  }

  type Subscription {
    gameUpdated(token: String!): Game!
    playerVoted(token: String!): PlayerExecuteRes!
    # playerVotedToKill(token: String!): PlayerExecuteRes!
    playerSentMessage(token: String!): Message!
    # playerSentVampireMessage(token: String!): Message!
  }
`;

export default typeDefs;
