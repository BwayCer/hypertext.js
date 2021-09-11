Gulp 小工具
=======


關於 [Gulp](https://gulpjs.com/) 的輔助工具集。


## 使用方法


```
import gulp from 'gulp';
import {GulpTool} from '@bwaycer/gulp-tool';

let gulpTool = new GulpTool({
  srcPathPart: 'path/to/src',
  infos: [
    {
      name: 'sample',
      src: '**/*', // or ['**/foo', '**/bar', ...]
      handle: {
        <handleName>: (readable, info) => {
          return readable
            .pipe(...)
          ;
        },
      },
    },
    ...
  ],
});

export default gulp.series(
  gulpTool.init(<handleName>, {distPathPart: 'path/to/dist'}),
  gulpTool.getTaskCleanDist(),
  gulpTool.getTask('sample'),
);
```

