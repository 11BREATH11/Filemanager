var firstLoad = true;

function ResizeFrame(wnd) {

    var content = wnd.getFrame().contents().find("iframe");
    var contentNew = wnd.getFrame().contents().find("#splitter");
    if (content.length > 0) {
        var contentBox = wnd.getFrame().contents().find("#fileinfo");

        var width = parseInt(contentBox.css("width").replace("px", "")) - 50;
        var height = parseInt(contentBox.css("height").replace("px", "")) - 50;
        
        content.css("width", width);
        content.css("height", height);
    }
    
}

function OpenFileMngr(user_id, fileRoot, serverRoot, serverMode, useFileTable) {

    firstLoad = false;
    $.window({
        showModal: false, modalOpacity: 0.5,
        title: "Work whith files",
        url: "Filemanager/index.html?user_id=" + user_id +
             "&fileRoot=" + fileRoot + "&serverRoot=" + serverRoot +
             "&serverMode=" + serverMode + "&useFileTable=" + useFileTable,
        width: 920, height: 600,
        bookmarkable: false,
        draggable: true,
        resizable: true,
        maxWidth:1024,
        maxHeight: 768,
        minWidth: 500,
        minHeight: 500,
        scrollable: false,
        afterResize: function (wnd) {
            setTimeout(function () { ResizeFrame(wnd) }, 30);
        },
        afterMaximize: function (wnd) {
            setTimeout(function () { ResizeFrame(wnd) }, 30);
        },        
        afterCascade: function (wnd) {
            setTimeout(function () { ResizeFrame(wnd) }, 30);
        }        

    });
};