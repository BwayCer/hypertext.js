
import path from 'path';
import {Readable, Writable, Transform} from 'stream';

import gulp from 'gulp';
// const multimatch = require('multimatch');

import {fsMkdir, fsRm, gulpSymlink} from './utils.js';


/**
 * 處裡群組包轉換器：
 * 可以在 `gulp.pipe()` 中丟入一組處裡包，因此提高模組化的便利性。
 *
 * @func _mediumTransform
 * @param {Function} handlePipeGroup
 * @return {stream.Transform}
 */
// NOTE: 如果只用 `Transform` 則只會觸發最後一個 `pipe()`。
function _mediumTransform(handlePipeGroup) {
  let readable = new Readable({
    // TODO: 從此處著手處理串流過載問題？
    read(/* size */) {},
    objectMode: true,
  });
  let currFlushCallback = null;
  let transform = new Transform({
    transform(chunk, encoding, callback) {
      readable.push(chunk, encoding);
      callback(null);
    },
    flush(callback) {
      readable.push(null);
      currFlushCallback = callback;
    },
    objectMode: true,
  });
  handlePipeGroup(readable)
    .pipe(new Writable({
      write(chunk, encoding, callback) {
        transform.push(chunk);
        callback(null);
      },
      final(callback) {
        callback(null);
        currFlushCallback(null);
      },
      objectMode: true,
    }))
  ;
  return transform;
}


/**
 * gulpTool
 *
 * @module gulpTool
 */

/**
 * Gulp 工具。
 *
 * @memberof module:gulpTool.
 * @class GulpTool
 * @param {(Object|Array)} conf - 設定資訊。
 * 若類型為 Object 則有效屬性為 `{cwd, srcPathPart, distPathPart, infos}`。
 */
function GulpTool(conf) {
  this._isInit = false;
  this.conf = conf instanceof Array ? {infos: conf} : conf;
}

/**
 * 初始化。
 *
 * @memberof module:gulpTool.GulpTool#
 * @func init
 * @param {String} mode
 * @param {Object} [conf]
 */
GulpTool.prototype.init = function use(mode, conf = null) {
  let fn = (done) => {
    let {
      cwd, srcPathPart, distPathPart, infos
    } = Object.assign({
      cwd: process.cwd(),
      srcPathPart: 'src',
      distPathPart: 'dist',
      infos: [],
    }, this.conf, conf);
    let basePath = path.join(cwd, srcPathPart);
    let conf_ = {mode, cwd, srcPathPart, basePath, distPathPart};

    this._isInit = true;
    this.conf = conf_;
    this.list = infos
      .filter(item => item.handle.hasOwnProperty(mode) && item.handle[mode] !== null)
      .map(item => {
        item.handle = item.handle[mode];
        return Object.assign({
          name: '',
          src: '',
          handle: null,
        }, item);
      })
    ;

    done();
  };
  Reflect.defineProperty(fn, 'name', {value: `use_${mode}`});
  return fn;
};

GulpTool.prototype._checkHasInit = function checkHasInit() {
  if (!this._isInit) {
    throw Error('Not initialized yet.');
  }
};

/**
 * 從名稱取得 Gulp 設定資訊。
 *
 * @memberof module:gulpTool.GulpTool#
 * @func getByName
 * @param {String} name
 * @return {?Object}
 */
GulpTool.prototype.getByName = function getByName(name) {
  this._checkHasInit();

  let info = this.list.find(item => item.name === name);
  return info == null ? null : info;
};

/***
 * 從路徑取得 Gulp 設定資訊。
 *
 * @memberof module:gulpTool.GulpTool#
 * @func getByPath
 * @param {String} pathPart
 * @return {?Object}
 */
// GulpTool.prototype.getByPath = function getByPath(pathPart) {
  // this._checkHasInit();

  // let info = this.list.find(item => {
    // let pathMatch = multimatch(pathPart, item.src);
    // return pathMatch.length > 0;
  // });
  // return info == null ? null : info;
// };

/**
 * 取得清空 dist 目錄任務。
 *
 * @memberof module:gulpTool.GulpTool#
 * @func getTaskCleanDist
 * @return {Function}
 */
GulpTool.prototype.getTaskCleanDist = function getTaskCleanDist() {
  let fn = async () => {
    let distPath = path.join(this.conf.cwd, this.conf.distPathPart);
    await fsRm(distPath, {recursive: true});
    await fsMkdir(distPath);
  };
  Reflect.defineProperty(fn, 'name', {value: 'cleanDist'});
  return fn;
};

GulpTool.prototype._getNewConf = function getNewConf(addConf) {
  if (typeof addConf.distPathPart !== 'string') {
    delete addConf['distPathPart'];
  }
  return {
    ...this.conf,
    ...addConf,
  };
};

function _handleGlob(prefix, glob) {
  return glob.startsWith('!')
    ? '!' + path.join(prefix, glob.substring(1))
    : path.join(prefix, glob)
  ;
}

GulpTool.prototype._getGlobs = function getGlobs(globs) {
  let srcPathPart = this.conf.srcPathPart;
  return typeof globs === 'string'
    ? _handleGlob(srcPathPart, globs)
    : globs.map(item => _handleGlob(srcPathPart, item))
  ;
};

/**
 * 取得任務。
 *
 * @memberof module:gulpTool.GulpTool#
 * @func getTask
 * @param {String} pathPart
 * @param {String} [distPathPart]
 * @return {?Object}
 */
GulpTool.prototype.getTask = function getTask(name, distPathPart) {
  let fn = () => {
    let info = this.getByName(name);
    let newConf = this._getNewConf({info, distPathPart});
    let inputConf = {
      cwd: this.conf.cwd,
      base: this.conf.basePath,
      allowEmpty: true,
    };
    return gulp.src(this._getGlobs(info.src), inputConf)
      .pipe(_mediumTransform(readable => info.handle(readable, newConf)))
      .pipe(gulp.dest(newConf.distPathPart))
    ;
  };
  Reflect.defineProperty(fn, 'name', {value: `handle_${name}`});
  return fn;
};

/**
 * 取得生成鏈結文件任務。
 *
 * @memberof module:gulpTool.GulpTool#
 * @func getSymlinkTask
 * @param {String} name
 * @param {String} [distPathPart]
 * @return {Function}
 */
GulpTool.prototype.getSymlinkTask = function getSymlinkTask(name, distPathPart) {
  let fn = () => {
    let info = this.getByName(name);
    let newConf = this._getNewConf({info, distPathPart});
    let inputConf = {
      cwd: this.conf.cwd,
      base: this.conf.basePath,
      allowEmpty: true,
    };
    return gulp.src(this._getGlobs(info.src), inputConf)
      .pipe(_mediumTransform(readable => info.handle(readable, newConf)))
      .pipe(gulpSymlink(newConf.distPathPart))
    ;
  };
  Reflect.defineProperty(fn, 'name', {value: `symlink_${name}`});
  return fn;
};


export default GulpTool;

