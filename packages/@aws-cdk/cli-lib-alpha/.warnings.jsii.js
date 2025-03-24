function _aws_cdk_cli_lib_alpha_IAwsCdkCli(p) {
}
function _aws_cdk_cli_lib_alpha_CdkAppDirectoryProps(p) {
}
function _aws_cdk_cli_lib_alpha_ICloudAssemblyDirectoryProducer(p) {
}
function _aws_cdk_cli_lib_alpha_AwsCdkCli(p) {
}
function _aws_cdk_cli_lib_alpha_RequireApproval(p) {
}
function _aws_cdk_cli_lib_alpha_SharedOptions(p) {
}
function _aws_cdk_cli_lib_alpha_HotswapMode(p) {
}
function _aws_cdk_cli_lib_alpha_DeployOptions(p) {
    if (p == null)
        return;
    visitedObjects.add(p);
    try {
        if (!visitedObjects.has(p.hotswap))
            _aws_cdk_cli_lib_alpha_HotswapMode(p.hotswap);
        if (!visitedObjects.has(p.progress))
            _aws_cdk_cli_lib_alpha_StackActivityProgress(p.progress);
        if (!visitedObjects.has(p.requireApproval))
            _aws_cdk_cli_lib_alpha_RequireApproval(p.requireApproval);
    }
    finally {
        visitedObjects.delete(p);
    }
}
function _aws_cdk_cli_lib_alpha_StackActivityProgress(p) {
}
function _aws_cdk_cli_lib_alpha_DestroyOptions(p) {
}
function _aws_cdk_cli_lib_alpha_ListOptions(p) {
}
function _aws_cdk_cli_lib_alpha_SynthOptions(p) {
}
function _aws_cdk_cli_lib_alpha_BootstrapOptions(p) {
}
function print(name, deprecationMessage) {
    const deprecated = process.env.JSII_DEPRECATED;
    const deprecationMode = ["warn", "fail", "quiet"].includes(deprecated) ? deprecated : "warn";
    const message = `${name} is deprecated.\n  ${deprecationMessage.trim()}\n  This API will be removed in the next major release.`;
    switch (deprecationMode) {
        case "fail":
            throw new DeprecationError(message);
        case "warn":
            console.warn("[WARNING]", message);
            break;
    }
}
function getPropertyDescriptor(obj, prop) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (descriptor) {
        return descriptor;
    }
    const proto = Object.getPrototypeOf(obj);
    const prototypeDescriptor = proto && getPropertyDescriptor(proto, prop);
    if (prototypeDescriptor) {
        return prototypeDescriptor;
    }
    return {};
}
const visitedObjects = new Set();
class DeprecationError extends Error {
    constructor(...args) {
        super(...args);
        Object.defineProperty(this, "name", {
            configurable: false,
            enumerable: true,
            value: "DeprecationError",
            writable: false,
        });
    }
}
module.exports = { print, getPropertyDescriptor, DeprecationError, _aws_cdk_cli_lib_alpha_IAwsCdkCli, _aws_cdk_cli_lib_alpha_CdkAppDirectoryProps, _aws_cdk_cli_lib_alpha_ICloudAssemblyDirectoryProducer, _aws_cdk_cli_lib_alpha_AwsCdkCli, _aws_cdk_cli_lib_alpha_RequireApproval, _aws_cdk_cli_lib_alpha_SharedOptions, _aws_cdk_cli_lib_alpha_HotswapMode, _aws_cdk_cli_lib_alpha_DeployOptions, _aws_cdk_cli_lib_alpha_StackActivityProgress, _aws_cdk_cli_lib_alpha_DestroyOptions, _aws_cdk_cli_lib_alpha_ListOptions, _aws_cdk_cli_lib_alpha_SynthOptions, _aws_cdk_cli_lib_alpha_BootstrapOptions };
