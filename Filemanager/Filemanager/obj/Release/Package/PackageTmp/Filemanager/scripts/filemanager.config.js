{
    "_comment": "IMPORTANT : go to the wiki page to know about options configuration https://github.com/simogeo/Filemanager/wiki/Filemanager-configuration-file",
"options": {
    "culture": "ua",
    "lang": "ashx",
    "defaultViewMode": "grid",
    "autoload": true,
    "showFullPath": false,
    "showTitleAttr": false,
    "expandedFolder": "All",
    "browseOnly": false,
    "showConfirmation": false,
    "showThumbs": true,
    "generateThumbnails": true,
    "searchBox": true,
    "listFiles": true,
    "fileSorting": "default",
    "chars_only_latin": false,
    "dateFormat": "d M Y H:i",
    "_comment": "����� � ������� ��������� ������ ������� true",
    "serverRoot": false,        
    "showButtonMode": true,        
    "fileRoot": "//00app003/sql2012/MP_CORPZ_Files/Files/Clinic_1/PatientCases/Case_123/",        
    "_comment": "��������� ����� ������ � ������� true, ���������� ����� false",
    "serverMode": false,
    "_comment": "������������ ���� ������ FileTable true",
    "useFileTable": false,
    "relPath": false,
    "logger": false,
    "capabilities": ["select", "download", "rename", "delete", "replace"],
    "plugins": []
},    
    "security": {
        "allowChangeExtensions": false,
        "uploadPolicy": "DISALLOW_ALL",        
        "uploadRestrictions": [
            "jpg",
            "jpeg",
            "gif",
            "png",
            "svg",
            "txt",
            "pdf",
            "odp",
            "ods",
            "odt",
            "rtf",
            "doc",
            "docx",
            "xls",
            "xlsx",
            "ppt",
            "pptx",
            "csv",
            "ogv",
            "mp4",
            "webm",
            "m4v",
            "ogg",
            "mp3",
            "wav",
            "html",
            "mht",
            "htm",
            ""
        ]
    },
    "upload": {
        "overwrite": false,
        "imagesOnly": false,
        "fileSizeLimit": 16
    },
    "exclude": {
        "unallowed_files": [
            ".htaccess",
            "web.config"
        ],
        "unallowed_dirs": [
            "_thumbs",
            ".CDN_ACCESS_LOGS",
            "cloudservers"
        ],
        "unallowed_files_REGEXP": "/^\\.",
        "unallowed_dirs_REGEXP": "/^\\."
    },
    "images": {
        "imagesExt": [
            "jpg",
            "jpeg",
            "gif",
            "png",
            "svg"
        ],
        "resize": {
            "enabled":true,
        	"maxWidth": 1280,
            "maxHeight": 1024
        }
    },
    "web": {
        "webExt": [
            "html",
            "htm",
            "mht",
            "txt",
            "xml"
        ]
    },
    "videos": {
        "showVideoPlayer": true,
        "videosExt": [
            "ogv",
            "ogg",
            "mp4",
            "webm",
            "m4v",
            "avi",
            "3gp",
            "flv"
        ],
        "videosPlayerWidth": 400,
        "videosPlayerHeight": 222
    },
    "audios": {
        "showAudioPlayer": true,
        "audiosExt": [            
            "mp3",
            "wav"
        ]
    },
    "edit": {
        "enabled": true,
        "lineNumbers": true,
        "lineWrapping": true,
        "codeHighlight": false,
        "theme": "elegant",
        "editExt": [
            "txt"
        ]
    },
    "extras": {
        "extra_js": [],
        "extra_js_async": true
    },
    "icons": {
        "path": "images/fileicons/",
        "directory": "_Open.png",
        "default": "default.png"
    }
}