/**
 * CacheJson
 * @author LuoWen
 * @date 20160525
 */
/**
 ***********************************工具方法 Start ***********************************
 */
/**
 * 执行一次
 * @param fn
 * @returns {Function}
 * @private
 */
function _once(fn) {
    return function() {
        if (fn === null) return;
        fn.apply(this, arguments);
        fn = null;
    };
}

/**
 * 绑定上下文
 * @param scope
 * @param fn
 * @returns {Function}
 * @private
 */
function _bind(scope, fn) {
    return function() {
        fn.apply(scope, arguments);
    };
}
/**
 ***********************************工具方法 END ***********************************
 */

function CacheJson() {}
var p = CacheJson.prototype;
var DIR_ZUOYE = "mathgames0";
var CACHE_FILE_SUFFIX = ".cache";

var CacheErrorCode = {
    FILE_NOT_FOUND: [1, 'file not found!'],
    FILE_NAME_EMPTY: [2, "file name should not be empty!"],
    GET_FILE_ERROR: [3, "get file error"],
    CREATE_WRITER: [4, "fail to create a writer"],
    ENTRY_REMOVE_FAILED: [5, "fail to remove a file"],
    FILE_WRITER_ONERROR: [6, 'file writer on error'],
    FAIL_RESOLVE_FS: [7, "fail to resole fs"],
};

/**
 * 缓存对象
 * @param {[type]} code [description]
 * @param {[type]} msg  [description]
 */
function CacheError(code, msg) {
    return {
        code: code[0],
        msg: msg || code[1] || ""
    };
}

/**
 * 获取一个key
 * @param {[type]}   fileName [description]
 * @param {[type]}   content  [description]
 * @param {Function} callback [description]
 */
p.getItem = function(fileName, callback) {
    var me = this;
    callback = callback || function() {};

    if (!fileName) {
        return callback(new CacheError(CacheErrorCode.FILE_NAME_EMPTY));
    }

    me.getFilesystem(function(dir) {
        // console.log("got main dir", dir);
        dir.getFile(fileName + CACHE_FILE_SUFFIX, {
            create: false
        }, function(file) {
            file.file(function(file){
                me.readAsText(file, callback);
            }, function(error){
                callback(new CacheError(CacheErrorCode.GET_FILE_ERROR, error))
            });
        }, function(error) {
            callback(new CacheError(CacheErrorCode.GET_FILE_ERROR, error))
        });
    }, callback);
}

/**
 * 设置一个key
 * @param {[type]}   fileName [description]
 * @param {[type]}   content  [description]
 * @param {Function} callback [description]
 */
p.setItem = function(fileName, content, callback) {
    var me = this;
    content = content || "";
    callback = callback || function() {};

    if (!fileName) {
        return callback(new CacheError(CacheErrorCode.FILE_NAME_EMPTY));
    }

    me.getFilesystem(function(dir) {
        //console.log("got main dir", dir);
        dir.getFile(fileName + CACHE_FILE_SUFFIX, {
            create: true
        }, function(file) {
            // console.log("got the file", file);
            // logOb = file;
            me.writeLog(file, content, callback);
        }, function(error) {
            callback(new CacheError(CacheErrorCode.GET_FILE_ERROR, error))
        });
    }, callback);
}

/**
 * 写入内容
 * @param  {[type]}   file     [description]
 * @param  {[type]}   content  [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
p.writeLog = function(file, content, callback) {
    var me = this;
    callback = callback || function() {};

    file.createWriter(function(fileWriter) {
        //默认不使用append
        //fileWriter.seek(fileWriter.length);
        
        fileWriter.onwriteend = function(e) {
            callback(null, e);
        };
        fileWriter.onerror = function(e) {
            console.log('Write failed: ' + e.toString());
            callback(new CacheError(CacheErrorCode.FILE_WRITER_ONERROR, e), e.toString());
        };

        var blob = new Blob([content], {
            type: 'text/plain'
        });
        fileWriter.write(blob);
    }, function(error) {
        console.error("fail to create writer", error);
        callback(new CacheError(CacheErrorCode.CREATE_WRITER, error));
    });
}

p.readAsText = function(file, callback) {
    var reader = new FileReader();
    reader.onloadend = function(evt) {
        // console.log("Read as text");
        // console.log(evt.target.result);
        callback(null, evt.target.result, evt.target, evt);
    };
    reader.readAsText(file);
};

/**
 * 获取文件系统
 * @param  {[type]} success [description]
 * @param  {[type]} fail    [description]
 * @return {[type]}         [description]
 */
p.getFilesystem = function(success, fail) {
    window.resolveLocalFileSystemURL(cordova.file.dataDirectory + DIR_ZUOYE, success, function(e) {
        console.error("fail to resolveLocalFileSystemURL", cordova.file.dataDirectory + DIR_ZUOYE);
        typeof fail === 'function' && fail(new CacheError(CacheErrorCode.FAIL_RESOLVE_FS, e));
    });
};

/**
 * 移除key
 * @param  {[type]}   fileName [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
p.removeItem = function(fileName, callback) {
    var me = this;

    me.getFilesystem(function(dir) {
        dir.getFile(fileName + CACHE_FILE_SUFFIX, {
                create: false
            },
            function(entry) {
                entry.remove(function(entry) {
                    callback(null, entry);
                }, function(e) {
                    callback(new CacheError(CacheErrorCode.ENTRY_REMOVE_FAILED, e));
                });
            },
            function(e) {
                callback(new CacheError(CacheErrorCode.FILE_NOT_FOUND, e));
            });
    });
};

/**
 * 消除所有的key
 * @param  {[type]}   fileName [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
p.clear = function(fileName, callback) {
    var me = this;
    
    callback = callback || function(){};
    if (typeof fileName === 'function') callback = fileName;

    me.getFilesystem(function(dirEntry) {
        dirEntry.createReader().readEntries(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isFile) return;
                if (!entry.name.match(new RegExp(CACHE_FILE_SUFFIX + "$"))) return;

                me.removeItem(entry.name.replace(CACHE_FILE_SUFFIX, ""), callback);
            });
        });
    }, callback);
};

module && (module.exports = new CacheJson());