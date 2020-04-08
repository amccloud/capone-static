export default function(sequelize, DataTypes) {
  const File = sequelize.define('File', {
    siteId: {
      type: DataTypes.INTEGER
    },
    deploymentId: {
      type: DataTypes.INTEGER
    },
    key: {
      type: DataTypes.TEXT,
    },
    contentSha1: {
      type: DataTypes.TEXT
    },
    contentType: {
      type: DataTypes.TEXT
    },
    contentLength: {
      type: DataTypes.INTEGER
    },
    storageUrl: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'files',
    timestamps: false,
    associate: ({Site}) => {
      File.belongsTo(Site);
    },
    indexes: [{
      // For finding exisiting files
      fields: ['siteId', 'contentSha1'],
      where: {
        storageUrl: null
      }
    }, {
      // For serving file
      fields: ['siteId', 'key']
    }]
  });

  return File;
}
