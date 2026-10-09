// The signing team comes from the build machine, so a teammate's Apple ID stays out of the repo.
module.exports = ({ config }) =>
  process.env.APPLE_TEAM_ID ? { ...config, ios: { ...config.ios, appleTeamId: process.env.APPLE_TEAM_ID } } : config;
