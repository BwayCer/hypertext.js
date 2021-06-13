'use strict';

/**
 * gulpTool
 *
 * @module gulpTool
 */


const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const {Readable, Writable, Transform} = require('stream');

const gulp = require('gulp');
// const multimatch = require('multimatch');


async function _fsRm(path, option) {
  try {
    await fsPromises.access(path, fs.constants.F_OK);
    await fsPromises.rm(path, Object.assign({
      recursive: false,
      force: true,
    }, option));
  } catch {
    // 目錄不存在
  }
}


/**
 * 處裡群組包轉換器：
 * 可以在 `gulp.pipe()` 中丟入一組處裡包，因此提高模組化的便利性。
 *
 * @memberof module:gulpTool.
 * @func groupTransform
 * @param {Function} handlePipeGroup
 * @return {stream.Transform}
 */
function groupTransform(handlePipeGroup) {
  let readable = new Readable({
    read(size) {},
    objectMode: true,
  });
  let currChunk = null;
  let currCallback = null;
  handlePipeGroup(readable)
    .pipe(new Writable({
      write(chunk, encoding, callback) {
        let theCurrCallback = currCallback;
        currChunk = null;
        currCallback = null;
        theCurrCallback(null, chunk);
        callback(null);
      },
      objectMode: true,
    }))
  ;

  return new Transform({
    transform(chunk, encoding, callback) {
      currChunk = chunk;
      currCallback = callback;
      readable.push(chunk, encoding);
    },
    flush(callback) {
      readable.push(null);
      callback(null);
    },
    objectMode: true,
  });
}


/**
 * Gulp 工具。
 *
 * @memberof module:gulpTool.
 * @class GulpTool
 * @param {(Object|Array)} conf
 */
function GulpTool(conf) {
  this._ynInit = false;
  this.conf = conf;
}

/**
 * 初始化。
 *
 * @memberof module:gulpTool.GulpTool#
 * @func init
 * @param {String} mode
 */
GulpTool.prototype.init = function use(mode) {
  let fn = (done) => {
    this.conf.dist = this.conf.dist[mode];
    this.list = this.conf.filterList
      .filter(item => item.handle.hasOwnProperty(mode) && item.handle[mode] !== null)
      .map(item => {
        item.handle = item.handle[mode];
        return Object.assign({
          name: '',
          src: '',
          toExt: null,
          handle: null,
        }, item);
      })
    ;
    this._ynInit = true;
    done();
  };
  Reflect.defineProperty(fn, 'name', {value: `use_${mode}`});
  return fn;
};

GulpTool.prototype._checkHasInit = function checkHasInit() {
  if (!this._ynInit) {
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
    let distPath = this.conf.dist;
    await _fsRm(distPath, {recursive: true});
    await fsPromises.mkdir(distPath, {recursive: true});
  };
  Reflect.defineProperty(fn, 'name', {value: `cleanDist`});
  return fn;
};

/**
 * 取得任務。
 *
 * @memberof module:gulpTool.GulpTool#
 * @func getTask
 * @param {String} pathPart
 * @return {?Object}
 */
GulpTool.prototype.getTask = function getTask(name) {
  let fn = () => {
    let info = this.getByName(name);
    let distPath = this.conf.dist;
    let inputConf = {
      base: path.join(this.conf.cwd, this.conf.src),
    };
    return gulp.src(info.src, inputConf)
      .pipe(groupTransform(readable => info.handle(readable)))
      .pipe(gulp.dest(distPath))
    ;
  };
  Reflect.defineProperty(fn, 'name', {value: `handle_${name}`});
  return fn;
};

/**
 * 取得生成鏈結文件任務。
 *
 * @memberof module:gulpTool.GulpTool#
 * @func getTaskLinks
 */
GulpTool.prototype.getTaskLinks = function getTaskLinks(list) {
  let fn = () => {
    let cwd = this.conf.cwd;
    let distPath = this.conf.dist;
    return Promise.all([
      ...list.map(item => fsPromises.symlink(
        path.relative(
          path.join(cwd, distPath, item.to, '..'),
          path.join(cwd, item.src)
        ),
        path.join(distPath, item.to)
      ))
    ]);
  };
  Reflect.defineProperty(fn, 'name', {value: `links`});
  return fn;
};


module.exports = {
  groupTransform,
  GulpTool,
};

