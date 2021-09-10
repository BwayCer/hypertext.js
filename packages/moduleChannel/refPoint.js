
import path from 'path';


let _refPointMember = {
  to: function resolve(...pathParts) {
    return this._.resolveFilePath(true, this._._appPathPart, pathParts);
  },

  partJoin: function partJoin(...pathParts) {
    return this._.resolveFilePath(false, this._._appPathPart, pathParts);
  },

  relative: function resolvePart(toPath) {
    return this._.relativeFilePath(this._._appPathPart, toPath);
  },

  setAppPath: function setAppPath(importMetaUrl, projectPath) {
    return this._.setAppPath(importMetaUrl, projectPath);
  },
};

export class RefPoint {
  constructor() {
    this._isInit = false;
    this._projectPath = ''; // default: process.cwd()
    this._appPathPart = '';
  }

  static bind(...args) {
    let refPoint = Object.assign(
      function resolve(...pathParts) {
        // same as `refPoint.to()`
        return refPoint._.resolveFilePath(
          true,
          refPoint._._appPathPart,
          pathParts
        );
      },
      _refPointMember,
    );
    refPoint._ = new RefPoint();

    if (args.length > 0) {
      refPoint.setAppPath(...args);
    }

    return refPoint;
  }

  resolveFilePath(isFull, basePath, pathParts) {
    if (!this._isInit) {
      throw Error('Not initialized yet.');
    }
    let originPath = isFull ? this._projectPath : '';
    return path.join(originPath, basePath, ...pathParts);
  }

  relativeFilePath(basePath, toPath) {
    if (!this._isInit) {
      throw Error('Not initialized yet.');
    }
    return path.relative(
      path.join(this._projectPath, basePath),
      toPath
    );
  }

  setAppPath(importMetaUrl, projectPath) {
    this._isInit = true;
    this._projectPath = typeof projectPath === 'string' ? projectPath : process.cwd();

    let entryPagePath = importMetaUrl.substring(5);
    this._appPathPart = path.relative(
      this._projectPath,
      path.join(entryPagePath, '..'),
    );
  }
}

export let refPoint = RefPoint.bind();

