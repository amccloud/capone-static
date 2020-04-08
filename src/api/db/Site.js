export default function(sequelize, DataTypes) {
  const Site = sequelize.define('Site', {
    name: {
      type: DataTypes.TEXT
    },
    domain: {
      type: DataTypes.TEXT
    },
    headDeploymentId: {
      type: DataTypes.INTEGER
    },
    lastDeploymentId: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    ownerId: {
      type: DataTypes.INTEGER
    }
  }, {
    tableName: 'sites',
    timestamps: false,
    associate: ({User}) => {
      Site.belongsTo(User, {foreignKey: 'ownerId'});
    },
    indexes: [{
      // For finding site by name
      fields: ['ownerId', 'name']
    }, {
      // For finding site by domain
      fields: ['domain']
    }]
  });

  return Site;
}
