'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/*istanbul ignore next*/
const EventEmitter = require("events");
const yaml = require("js-yaml");
const path = require("path");
const fs = require("fs");
const symbolOptions = Symbol();
const symbolConfig = Symbol();
/*istanbul ignore next*/
class RealtimeConfig extends EventEmitter {
    /**
     * @file rtconfig
     *
     * A real time updated configuration.
     * @author
     *   zswang (http://weibo.com/zswang)
     * @version 1.0.0
     * @date 2018-02-09
     */
    /**
     * 创建实时配置对象
     *
     * @param filename 文件名
     * @param options 配置项
     * @example RealtimeConfig:base
      ```js
      var filename = './test/config/test1.json'
      var obj = new RealtimeConfig(filename)
      console.log(obj.host)
      // > 127.0.0.1
      ```
     * @example RealtimeConfig:module.exports
      ```js
      var filename = './test/config/test2.js'
      var obj = new RealtimeConfig(filename)
      console.log(obj.host)
      // > 127.0.0.1
      ```
     * @example RealtimeConfig:yaml
      ```js
      var filename = './test/config/test1.yaml'
      var obj = new RealtimeConfig(filename)
      console.log(obj.host)
      // > 192.168.0.101
      ```
     * @example RealtimeConfig:option.onupdate
      ```js
      var filename = './test/config/test3.js'
      var fs = require('fs')
      fs.writeFileSync(filename, 'module.exports = { host: "127.0.0.1" }')
      var obj = new RealtimeConfig(filename, {
        onupdate: function (config) {
          fs.unlinkSync(filename)
          console.log(config.host)
          // > 127.0.0.1
          // * done
        }
      })
      ```
     * @example RealtimeConfig:option.interval
      ```js
      var filename = './test/config/test4.js'
      var fs = require('fs')
      fs.writeFileSync(filename, 'module.exports = { host: "127.0.0.1" }')
      var obj = new RealtimeConfig(filename, {
        interval: 500
      })
      setTimeout(function () {
        fs.writeFileSync(filename, 'module.exports = { host: "192.168.0.1" }')
      }, 10)
      setTimeout(function () {
        fs.unlinkSync(filename)
      }, 1200)
      setTimeout(function () {
        console.log(obj.host)
        // > 192.168.0.1
        // * done
      }, 1000)
      ```
     * @example RealtimeConfig:option.onerror catch
      ```js
      var filename = './test/config/test5.js'
      var fs = require('fs')
      fs.writeFileSync(filename, '#error')
      var obj = new RealtimeConfig(filename)
      // * throw
      ```
     * @example RealtimeConfig:option.onerror
      ```js
      var filename = './test/config/test5.js'
      var fs = require('fs')
      fs.writeFileSync(filename, '#error')
      new RealtimeConfig(filename, {
        debug: true,
        onerror: function (error) {
          console.log(['Unexpected token ILLEGAL', 'Invalid or unexpected token'].indexOf(error) >= 0)
          // > true
          // * done
        }
      })
      new RealtimeConfig(filename, {
        onerror: function (error) {}
      })
      setTimeout(function () {
        fs.unlinkSync(filename)
      }, 1000)
      ```
     */
    constructor(filename, options = {}) {
        super();
        this[symbolOptions] = Object.assign({ interval: 60000, modifyTime: 0, filename: filename }, options);
        if (typeof options.onupdate === 'function') {
            this.on('update', options.onupdate);
        }
        if (typeof options.onerror === 'function') {
            this.on('error', options.onerror);
        }
        this[symbolConfig] = {};
        this.update();
    }
    /**
     * 转换为 JSON 对象
     *
     * @return {Object}
     */
    getJSON() {
        return this[symbolConfig];
    }
    /**
     * 转为字符串
     *
     * @return {String}
     * @example RealtimeConfig:toString()
      ```js
      var filename = './test/config/test2-1.config'
      var fs = require('fs')
      fs.writeFileSync(filename, '{host: "127.0.0.1", port: 3309}')
      var obj = new RealtimeConfig(filename)
      fs.unlinkSync(filename)
      console.log(obj.toString())
      // > {"host":"127.0.0.1","port":3309}
      ```
     */
    toString() {
        return JSON.stringify(this.getJSON());
    }
    /**
     * 定时更新数据
     */
    update() {
        let options = this[symbolOptions];
        let config = this[symbolConfig];
        try {
            let stat = fs.statSync(options.filename);
            if (options.modifyTime !== Number(stat.mtime)) {
                let c;
                let content = String(fs.readFileSync(options.filename));
                switch (path.extname(options.filename).toLowerCase()) {
                    case '.yaml':
                    case '.yml':
                    case '.json':
                        c = yaml.safeLoad(content);
                        break;
                    default:
                        if (content.indexOf('module.exports') >= 0) {
                            c = new Function(`var module = {exports: {}};${content};return module.exports`)();
                        }
                        else {
                            c = new Function(`return (${content})`)();
                        }
                        break;
                }
                options.modifyTime = Number(stat.mtime);
                Object.keys(c).forEach(key => {
                    config[key] = c[key];
                });
                Object.keys(config).forEach(key => {
                    Object.defineProperty(this, key, {
                        get: () => {
                            return this[symbolConfig][key];
                        },
                        configurable: true,
                    });
                });
                this.emit('update', c);
            }
        }
        catch (ex) {
            this.emit('error', ex.message);
            if (options.debug) {
                console.error('rtconfig/src/index.ts:222 Read the config error. %s', ex.message);
            }
        }
        setTimeout(() => {
            this.update();
        }, options.interval);
    }
}
exports.RealtimeConfig = RealtimeConfig;
