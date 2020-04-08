export default function(sequelize, DataTypes) {
  const User = sequelize.define('User', {
    email: {
      type: DataTypes.TEXT
    },
    password: {
      type: DataTypes.TEXT
    },
    name: {
      type: DataTypes.TEXT
    },
    apiKey: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'users'
  });

  return User;
}
