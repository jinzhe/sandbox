# Chrome 专用沙盒缓存


## 安装

```sh
npm install --save @zee.kim/sandbox
```

## 使用

```javascript
var files = ['fs.mp4', 'fs.mp3'];
var sd = new sandbox(files, {
    success: function (tree) {
        console.log(sd.get("fs.mp4"));
        console.log(sd.get("fs.mp3"));
    }
});
```
 