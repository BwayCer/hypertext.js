模塊通道
=======


> 版本： v1.0.0

使用模塊模式的特性建立溝通通道。



## moduleGlobal 使用方式


```
// file: ./a.js
import global from '@bwaycer/module-channel';
global.isSignA = true;


// file: ./b.js
import global from '@bwaycer/module-channel';
import './a.js';

console.log(global);
// result: { isSignA: true }
```



## refPoint 使用方式


```
// file: <projectDir>/src/refPoint.js

// NOTE:
//   編譯器會優先執行 import，
//   並且將載入的表達式 (會先執行) 和方法 (調用才執行)
//   的程式碼都放在引用者程式碼 (主文件) 的上方，
//   所以要優先執行此行就必須而外單獨文件。

import {refPoint} from '@bwaycer/module-channel';

refPoint.setAppPath(
  import.meta.url, // 本文件的絕對路徑
  <projectDir>,    // (可選) 專案目錄的絕對路徑，預設為 `process.cwd()`
);


// file: <projectDir>/src/app/index.js
import {refPoint} from '@bwaycer/module-channel';
import '../refFrame.js';

refPoint([..., ]'path/to/file');
refPoint.to([..., ]'path/to/file');
// <projectDir>/src/[.../]path/to/file

refPoint.partJoin([..., ]'path/to/file');
// src/[.../]path/to/file

refPoint.relative('path/to/file');
// path.relative('<projectDir>/src', 'path/to/file')
```

