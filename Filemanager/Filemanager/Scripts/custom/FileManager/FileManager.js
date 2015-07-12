
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

var myWin;

$(window).on("orientationchange", function (event) {
    w = screen.width;    

    h = screen.height;  
    

    if (myWin != null) {

        myWin.resize(w, h);
    }
});


function OpenFileMngr(user_id, fileRoot, serverRoot, serverMode, useFileTable, langCode) {

    
    var isMob = isMobile.any();
    
    var w = 920;
    var h = 600;

    /*if (isMob) {

        w = $(window).width();

        h = $(window).height();
    }*/


    var url = "Filemanager/index.html?user_id=" + user_id +
                 "&fileRoot=" + fileRoot + "&serverRoot=" + serverRoot +
                 "&serverMode=" + serverMode + "&useFileTable=" + useFileTable + "&langCode=" +langCode;

    if (!isMob) {


        myWin = $.window({
            showModal: false, modalOpacity: 0.5,            
            url: url,
            width: w, height: h,
            bookmarkable: false,
            draggable: !isMob,
            resizable: !isMob,
            maxWidth: screen.width,
            maxHeight: screen.height,
            maximizable: !isMob,
            minimizable: !isMob,
            scrollable: true,
            afterResize: function (wnd) {

               setTimeout(function () { ResizeFrame(wnd) }, 50);
            },
            afterMaximize: function (wnd) {
                setTimeout(function () { ResizeFrame(wnd) }, 50);
            },
            afterCascade: function (wnd) {
                setTimeout(function () { ResizeFrame(wnd) }, 50);
            }
        });
    } else {

        var win = window.open(url, '_blank');
        win.focus();
    }

    
};
