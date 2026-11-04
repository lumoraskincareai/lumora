// Extends app.json. EAS builds don't have google-services.json (it is
// git-ignored), so on EAS the file comes from the GOOGLE_SERVICES_JSON file
// secret; locally it falls back to ./google-services.json.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
