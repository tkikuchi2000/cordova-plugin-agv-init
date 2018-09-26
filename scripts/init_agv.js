var fs = require('fs');
var deferral;

// 設定項目
var preferences = [
    { name: "CURRENT_PROJECT_VERSION",  value: 1 },
    { name: "VERSIONING_SYSTEM",  value: "apple-generic" }
];


// 文字列(config.xml)から任意のディレクティブの値を取得
function getConfigValue(name) {
    var value = getConfig().match(new RegExp('<' + name + '>(.*?)</' + name + '>', "i"));
    if(value && value[1]) {
        return value[1]
    } else {
        return null
    }
};

// config.xmlを取得
function getConfig() {
    var config = fs.readFileSync('config.xml', 'utf-8');
    if (config) {
        config = config.substring(config.indexOf('<'));
    }
    return config;
}

// XCode build configurationを更新
function updateXCBuildConfiguration(preference, buildConfig) {
    // XCBuildConfigurationのブロックを読み込み
    for (var blockName in buildConfig) {
        var block = buildConfig[blockName];
        // blockがオブジェクト かつ 'buildSettings'プロパティが存在
        if (typeof(block) === "object" && block["buildSettings"]) {
            block["buildSettings"][preference.name] = preference.value;
        }
    };
}

// project.pbxprojを更新
function updatePbxProj(ctx) {
    var path = ctx.requireCordovaModule('path');
    var xcode = require('xcode');

    var projectName = getConfigValue("name");
    var projectPath = path.join(ctx.opts.projectRoot, 'platforms/ios', projectName + '.xcodeproj/project.pbxproj');
    var xcodeProject = xcode.project(projectPath);

    xcodeProject.parse(function(err){
        if (err) {
            deferral.reject(err.message);
        } else {
            var buildConfig = xcodeProject.pbxXCBuildConfigurationSection();
            preferences.forEach(function(preference) {
                updateXCBuildConfiguration(preference, buildConfig);
            });
            // 同期書込
            fs.writeFileSync(projectPath, xcodeProject.writeSync(), 'utf-8');
            deferral.resolve();
        }
    });
}


module.exports = function(ctx) {
    deferral = ctx.requireCordovaModule('q').defer();
    try{
        updatePbxProj(ctx);
    }catch(err){
        deferral.reject('init_agv: Error: ' + err.message);
    }
    return deferral.promise;
};
