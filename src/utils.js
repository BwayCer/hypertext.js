
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import {Writable} from 'stream';


async function fsMkdir(path) {
  await fsPromises.mkdir(path, {recursive: true});
}

async function fsRm(path, option) {
  if (fs.existsSync(path)) {
    await fsPromises.rm(path, Object.assign({
      recursive: false,
      force: true,
    }, option));
  }
}

async function fsSymlink(target, path, type) {
  await fsRm(path, {recursive: true});
  await fsPromises.symlink(target, path, type);
}



/**
 * 產生鏈結文件管道。
 *
 * @func gulpSymlink
 * @param {String} directory
 * @return {stream.Writable}
 */
// NOTE:
// 1. gulp.symlink 會遇到 Error: premature close 問題
// 2. 此方法不會為資料夾建立鏈結文件。
function gulpSymlink(directory) {
  async function createSymlink({cwd, relative, path:filePath}) {
    let linkPath = path.join(cwd, directory, relative);
    let linkDirPath = path.join(linkPath, '..');
    let linkTarget = path.relative(linkDirPath, filePath);
    await fsMkdir(linkDirPath);
    await fsSymlink(linkTarget, linkPath);
  }

  let dirList = [];

  return new Writable({
    async write(chunk, encoding, callback) {
      let srcFileStat = await fsPromises.stat(chunk.path);
      if (srcFileStat.isDirectory()) {
        dirList.push({
          cwd: chunk.cwd,
          relative: chunk.relative,
          path: chunk.path
        });
      } else {
        await createSymlink(chunk);
      }
      callback(null);
    },
    async final(callback) {
      // NOTE:
      // `gulp.src()` 只有在目錄鏈結文件的子層明確匹配時
      // 才會如預期的查找其子目錄或文件。
      // 如：
      //   "./symlinkParent/symlinkDir/**" -> 會查找 symlinkDir 鏈結文件的子層
      //   "./symlinkParent/**" -> 只會查找到 symlinkDir 鏈結文件為止
      // 因此完整複製的邏輯為：
      // 1. 先建立文件的鏈結文件
      // 2. 檢查被過濾掉的目錄中是否有原目錄為鏈結文件且建立目的地的路徑不存在文件，
      //    並對其目錄的鏈結文件
      for (let idx = 0, len = dirList.length; idx < len; idx++) {
        let item = dirList[idx];
        let linkPath = path.join(item.cwd, directory, item.relative);
        if (fs.existsSync(linkPath)) {
          continue;
        }
        let srcFileLstat = await fsPromises.lstat(item.path);
        if (srcFileLstat.isSymbolicLink()) {
          await createSymlink(item);
        }
      }
      callback(null);
    },
    objectMode: true,
  });
}


export {
  fsMkdir, fsRm, fsSymlink,
  gulpSymlink,
};

