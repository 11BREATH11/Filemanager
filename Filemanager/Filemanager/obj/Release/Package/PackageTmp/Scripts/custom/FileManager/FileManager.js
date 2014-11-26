
var isMobile = {
    Android: function () {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function () {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function () {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function () {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function () {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function () {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

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

    var myWin;    
    var isMob = isMobile.any();    
    
    var myWin = $.window({
        showModal: false, modalOpacity: 0.5,
        title: "Work whith files",
        url: "Filemanager/index.html?user_id=" + user_id +
             "&fileRoot=" + fileRoot + "&serverRoot=" + serverRoot +
             "&serverMode=" + serverMode + "&useFileTable=" + useFileTable,
        width: 920, height: 600,
        bookmarkable: false,
        draggable: !isMob,
        resizable: true,
        minWidth: 500,
        minHeight: 500,
        maximizable: !isMob,
        minimizable: !isMob,
        scrollable: false,
        afterResize: function (wnd) {            
            
            setTimeout(function () { ResizeFrame(wnd) }, 30);
        },
        afterMaximize: function (wnd) {
            setTimeout(function () { ResizeFrame(wnd) }, 30);
        },        
        afterCascade: function (wnd) {
            setTimeout(function () { ResizeFrame(wnd) }, 30);
        },

        onOpen: function (wnd) {
            

        }
    });

    if (isMob) {

        myWin.maximize();
    }    
};
