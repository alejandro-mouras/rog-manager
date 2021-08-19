const GLib = imports.gi.GLib;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const CommandLineUtil = Me.imports.commandLineUtil;

var AsusctlUtil = class extends CommandLineUtil.CommandLineUtil {
  constructor() {
    super();
    let path = GLib.find_program_in_path("asusctl");
    this._argv = path ? [path] : null;
    this.path = path;
  }

  get asusHealth() {
    try {
      GLib.spawn_command_line_sync("asusctl")[1].toString().trim();
      return true;
    } catch (e) {
      return false;
    }
    // if (!this._output) return [];
    // else return [true];
    // return this._parseGenericSensorsOutput(/^temp\d+_input/, "temp");
  }

  get availableProfiles() {
    let profiles = JSON.parse(
      GLib.spawn_command_line_sync(this.path + " profile -l")[1]
        .toString()
        .trim()
        .slice(23)
    );
    return profiles;
    // return ["basic", "normal"];
  }

  get actualProfile() {
    let profile = JSON.parse(
      GLib.spawn_command_line_sync(this.path + " profile -a")[1]
        .toString()
        .trim()
        .slice(16)
    );
    return profile;
    // return ["basic", "normal"];
  }

  set newProfile(prof) {
    global.log("set profile " + prof);
    GLib.spawn_command_line_sync(this.path + " profile " + prof);
    // return ["basic", "normal"];
  }

  get gpu() {
    return this._parseGpuSensorsOutput(/^temp\d+_input/, "temp");
  }

  get rpm() {
    return this._parseGenericSensorsOutput(/^fan\d+_input/, "rpm");
  }

  get volt() {
    return this._parseGenericSensorsOutput(/^in\d+_input/, "volt");
  }

  _parseGenericSensorsOutput(sensorFilter, sensorType) {
    return this._parseSensorsOutput(sensorFilter, sensorType, false);
  }

  _parseGpuSensorsOutput(sensorFilter, sensorType) {
    return this._parseSensorsOutput(sensorFilter, sensorType, true);
  }

  _parseSensorsOutput(sensorFilter, sensorType, gpuFlag) {
    if (!this._output) return [];

    let data = [];
    try {
      data = JSON.parse(this._output.join(""));
    } catch (e) {
      try {
        // fix for wrong lm_sensors output
        // https://github.com/UshakovVasilii/gnome-shell-extension-freon/issues/114#issuecomment-491613545
        let lineRemoved = this._output.filter((l) => l.trim() !== ",").join("\n");
        let errorRemoved = lineRemoved.replace(/ERROR.*Can't read/, "");
        errorRemoved = errorRemoved.replace(/ERROR.*I\/O error/, "");
        data = JSON.parse(errorRemoved);
      } catch (e) {
        global.log(e.toString());
        return [];
      }
    }

    let sensors = [];
    for (var chipset in data) {
      let gpuFilter = /(radeon|amdgpu|nouveau)/;
      if (!data.hasOwnProperty(chipset) || (gpuFlag != gpuFilter.test(chipset) && sensorType === "temp")) continue;

      let chipsetSensors = data[chipset];
      for (var sensor in chipsetSensors) {
        if (!chipsetSensors.hasOwnProperty(sensor)) continue;

        let fields = chipsetSensors[sensor];
        for (var key in fields) {
          if (fields.hasOwnProperty(key) && sensorFilter.test(key)) {
            let feature = {
              label: sensor,
              [sensorType]: parseFloat(fields[key]),
            };
            sensors.push(feature);
            break;
          }
        }
      }
    }
    return sensors;
  }
};
