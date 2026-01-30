const hook = async function (opts) {
    // this `config` instance already have installed/uninstalled plugins loaded
    await opts.config.runCommand('autocomplete:create');
};
export default hook;
