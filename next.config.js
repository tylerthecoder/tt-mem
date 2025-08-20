module.exports = {
    webpack: (config, { isServer }) => {
        config.resolve = config.resolve || {};
        config.resolve.alias = config.resolve.alias || {};

        if (isServer) {
            config.externals = config.externals || [];
            config.externals.push('@openai/agents-realtime', 'ws');
        } else {
            config.resolve.alias['@openai/agents-realtime'] = false;
            config.resolve.alias['ws'] = false;
        }
        return config;
    },
};
