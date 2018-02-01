/**
 *	Filemanager JS core
*/
(function ($) {

    // function to retrieve GET params
    $.urlParam = function (name) {
        var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results)
            return results[1];
        else
            return 0;
    };

    /*---------------------------------------------------------
      Setup, Layout, and Status Functions
    ---------------------------------------------------------*/

    // We retrieve config settings from filemanager.config.js
    var loadConfigFile = function (type) {
        var json = null;
        type = (typeof type === "undefined") ? "user" : type;

        if (type == 'user') {
            var url = './scripts/filemanager.config.js';
        } else {
            var url = './scripts/filemanager.config.js.default'
        }

        $.ajax({
            'async': false,
            'url': url,
            'dataType': "json",
            cache: false,
            'success': function (data) {
                json = data;
            }
        });
        return json;
    };

    // loading default configuration file
    var configd = loadConfigFile('default');
    // loading user configuration file
    var config = loadConfigFile();

    // we merge default config and user config file
    var config = $.extend({}, configd, config);


    // <head> included files collector
    HEAD_included_files = new Array();


    /**
     * function to load a given css file into header
     * if not already included
     */
    loadCSS = function (href) {
        // we check if already included
        if ($.inArray(href, HEAD_included_files) == -1) {
            var cssLink = $("<link rel='stylesheet' type='text/css' href='" + href + "'>");
            $("head").append(cssLink);
            HEAD_included_files.push(href);
        }
    };

    /**
    * function to load a given js file into header
    * if not already included
    */
    loadJS = function (src) {
        // we check if already included
        if ($.inArray(src, HEAD_included_files) == -1) {
            var jsLink = $("<script type='text/javascript' src='" + src + "'>");
            $("head").append(jsLink);
            HEAD_included_files.push(src);
        }
    };

    var updateTrue = true;

    // Sets paths to connectors based on language selection.
    var fileConnector = config.options.fileConnector || 'connectors/' + config.options.lang + '/filemanager.' + config.options.lang;

    // Read capabilities from config files if exists
    // else apply default settings
    var capabilities = config.options.capabilities || new Array('edit','select', 'download', 'rename', 'move', 'delete', 'replace');

    // Get localized messages from file 
    // through culture var or from URL
    if ($.urlParam('langCode') != 0 && file_exists('scripts/languages/' + $.urlParam('langCode') + '.js')) config.options.culture = $.urlParam('langCode');

    loadJS('plupload/i18n/' + config.options.culture + '.js');

    var lg = [];
    $.ajax({
        url: 'scripts/languages/' + config.options.culture + '.js',
        async: false,
        dataType: 'json',
        success: function (json) {
            lg = json;
        }
    });

    // Options for alert, prompt, and confirm dialogues.
    $.prompt.setDefaults({
        overlayspeed: 'fast',
        show: 'fadeIn',
        opacity: 0.4,
        persistent: false
    });

    // Forces columns to fill the layout vertically.
    // Called on initial page load and on resize.
    var setDimensions = function () {
        var bheight = 20;

        if (config.options.searchBox === true) bheight += 33;

        if ($.urlParam('CKEditorCleanUpFuncNum')) bheight += 60;

        var newH = $(window).height() - $('#uploader').height() - bheight;
        $('#splitter, #filetree, #fileinfo, .vsplitbar').height(newH);

        var newW = $('#splitter').width() - 6 - $('#filetree').width();
        $('#fileinfo').width(newW);
    };

    // Display Min Path
    var displayPath = function (path, reduce) {

        reduce = (typeof reduce === "undefined") ? true : false;

        if (config.options.showFullPath == false) {
            // if a "displayPathDecorator" function is defined, use it to decorate path
            if ('function' === typeof displayPathDecorator) {
                return displayPathDecorator(path.replace(fileRoot, "/"));
            } else {
                path = path.replace(fileRoot, "/");
                if (path.length > 35 && reduce === true) {
                    var n = path.split("/");
                    path = '/' + n[1] + '/' + n[2] + '/(...)/' + n[n.length - 2] + '/';
                }
                return path;
            }
        } else {
            return path;
        }

    };

    // Set the view buttons state
    var setViewButtonsFor = function (viewMode) {
        if (viewMode == 'grid') {
            $('#grid').addClass('ON');
            $('#list').removeClass('ON');
        }
        else {
            $('#list').addClass('ON');
            $('#grid').removeClass('ON');
        }
    };

    // Test if a given url exists
    function file_exists(url) {
        // http://kevin.vanzonneveld.net
        // +   original by: Enrique Gonzalez
        // +      input by: Jani Hartikainen
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // %        note 1: This function uses XmlHttpRequest and cannot retrieve resource from different domain.
        // %        note 1: Synchronous so may lock up browser, mainly here for study purposes. 
        // *     example 1: file_exists('http://kevin.vanzonneveld.net/pj_test_supportfile_1.htm');
        // *     returns 1: '123'
        var req = this.window.ActiveXObject ? new ActiveXObject("Microsoft.XMLHTTP") : new XMLHttpRequest();
        if (!req) {
            throw new Error('XMLHttpRequest not supported');
        }

        // HEAD Results are usually shorter (faster) than GET
        req.open('HEAD', url, false);
        req.send(null);
        if (req.status == 200) {
            return true;
        }

        return false;
    }

    // preg_replace
    // Code from : http://xuxu.fr/2006/05/20/preg-replace-javascript/
    var preg_replace = function (array_pattern, array_pattern_replace, str) {
        var new_str = String(str);
        for (i = 0; i < array_pattern.length; i++) {
            var reg_exp = RegExp(array_pattern[i], "g");
            var val_to_replace = array_pattern_replace[i];
            new_str = new_str.replace(reg_exp, val_to_replace);
        }
        return new_str;
    };

    // cleanString (), on the same model as server side (connector)
    // cleanString
    var cleanString = function (str) {

        var cleaned = "";
        var p_search = new Array("Š", "š", "Đ", "đ", "Ž", "ž", "Č", "č", "Ć", "ć", "À",
                            "Á", "Â", "Ã", "Ä", "Å", "Æ", "Ç", "È", "É", "Ê", "Ë", "Ì", "Í", "Î", "Ï",
                            "Ñ", "Ò", "Ó", "Ô", "Õ", "Ö", "Ő", "Ø", "Ù", "Ú", "Û", "Ü", "Ý", "Þ", "ß",
                            "à", "á", "â", "ã", "ä", "å", "æ", "ç", "è", "é", "ê", "ë", "ì", "í",
                            "î", "ï", "ð", "ñ", "ò", "ó", "ô", "õ", "ö", "ő", "ø", "ù", "ú", "û", "ü",
                            "ý", "ý", "þ", "ÿ", "Ŕ", "ŕ", " ", "'", "/"
                            );
        var p_replace = new Array("S", "s", "Dj", "dj", "Z", "z", "C", "c", "C", "c", "A",
                            "A", "A", "A", "A", "A", "A", "C", "E", "E", "E", "E", "I", "I", "I", "I",
                            "N", "O", "O", "O", "O", "O", "O", "O", "U", "U", "U", "U", "Y", "B", "Ss",
                            "a", "a", "a", "a", "a", "a", "a", "c", "e", "e", "e", "e", "i", "i",
                            "i", "i", "o", "n", "o", "o", "o", "o", "o", "o", "o", "u", "u", "u", "u",
                            "y", "y", "b", "y", "R", "r", "_", "_", ""
                        );

        cleaned = preg_replace(p_search, p_replace, str);

        // allow only latin alphabet
        if (config.options.chars_only_latin) {
            cleaned = cleaned.replace(/[^_a-zA-Z0-9]/g, "");
        }

        cleaned = cleaned.replace(/[_]+/g, "_");

        return cleaned;
    };

    // nameFormat (), separate filename from extension before calling cleanString()
    // nameFormat
    var nameFormat = function (input) {
        filename = '';
        if (input.lastIndexOf('.') != -1) {
            filename = cleanString(input.substr(0, input.lastIndexOf('.')));
            filename += '.' + input.split('.').pop();
        } else {
            filename = cleanString(input);
        }
        return filename;
    };

    //Converts bytes to kb, mb, or gb as needed for display.
    var formatBytes = function (bytes) {
        var n = parseFloat(bytes);
        var d = parseFloat(1024);
        var c = 0;
        var u = [lg.bytes, lg.kb, lg.mb, lg.gb];

        while (true) {
            if (n < d) {
                n = Math.round(n * 100) / 100;
                return n + u[c];
            } else {
                n /= d;
                c += 1;
            }
        }
    };

    // Handle Error. Freeze interactive buttons and display
    // error message. Also called when auth() function return false (Code == "-1")
    var handleError = function (errMsg) {
        $('#fileinfo').html('<h1>' + errMsg + '</h1>');
        $('#newfile').attr("disabled", "disabled");
        $('#upload').attr("disabled", "disabled");
        $('#newfolder').attr("disabled", "disabled");
    };

    // Test if Data structure has the 'cap' capability
    // 'cap' is one of 'select', 'rename', 'delete', 'download', move
    function has_capability(data, cap) {
        if (data['File Type'] == 'dir' && (cap == 'download' || cap == 'replace')) return false;
        if (typeof (data['Capabilities']) == "undefined") return true;
        else return $.inArray(cap, data['Capabilities']) > -1;
    }

    // Test if file is authorized
    var isAuthorizedFile = function (filename) {
        if (config.security.uploadPolicy == 'DISALLOW_ALL') {
            if ($.inArray(getExtension(filename), config.security.uploadRestrictions) != -1) return true;
        }
        if (config.security.uploadPolicy == 'ALLOW_ALL') {
            if ($.inArray(getExtension(filename), config.security.uploadRestrictions) == -1) return true;
        }

        return false;
    };

    // from http://phpjs.org/functions/basename:360
    var basename = function (path, suffix) {
        var b = path.replace(/^.*[\/\\]/g, '');

        if (typeof (suffix) == 'string' && b.substr(b.length - suffix.length) == suffix) {
            b = b.substr(0, b.length - suffix.length);
        }

        return b;
    };

    // return filename extension 
    var getExtension = function (filename) {
        if (filename.split('.').length == 1) {
            return "";
        }
        return filename.split('.').pop().toLowerCase();
    };

    // return filename without extension {
    var getFilename = function (filename) {
        if (filename.lastIndexOf('.') != -1) {
            return filename.substring(0, filename.lastIndexOf('.'));
        } else {
            return filename;
        }
    };

    //Test if is editable file
    var isEditableFile = function (filename) {
        if ($.inArray(getExtension(filename), config.edit.editExt) != -1) {
            return true;
        } else {
            return false;
        }
    };

    var isEditableFileEditor = function (filename) {
        if ($.inArray(getExtension(filename), config.edit.editEditorExt) != -1) {
            return true;
        } else {
            return false;
        }
    };

    // Test if is image file
    var isImageFile = function (filename) {
        if ($.inArray(getExtension(filename), config.images.imagesExt) != -1) {
            return true;
        } else {
            return false;
        }
    };

    // Test if file is supported web video file
    var isVideoFile = function (filename) {
        if ($.inArray(getExtension(filename), config.videos.videosExt) != -1) {
            return true;
        } else {
            return false;
        }
    };

    var isWebFile = function (filename) {

        if (getExtension(filename) == "mht" && !msieversion()) {
            return false;
        }

        if ($.inArray(getExtension(filename), config.web.webExt) != -1) {
            return true;
        } else {
            return false;
        }
    };

    var isDocFile = function (filename) {        

        if ($.inArray(getExtension(filename), config.doc.docExt) != -1) {
            return true;
        } else {
            return false;
        }
    };

    // Test if file is supported web audio file
    var isAudioFile = function (filename) {
        if ($.inArray(getExtension(filename), config.audios.audiosExt) != -1) {
            return true;
        } else {
            return false;
        }
    };

    // Return HTML video player 
    var getVideoPlayer = function (data) {


        if (!config.options.serverRoot) {

            var url = config.options.fileRoot + data['Path'].substr(fileRoot.length, data['Path'].length - fileRoot.length);

        } else {
            var url = "connectors/ashx/filemanager.ashx?mode=redirect&path=" + encodeURIComponent(data['Path']);
        }

        var code = '<center><video id = "myVideo"  width=' + config.videos.videosPlayerWidth + ' height=' + config.videos.videosPlayerHeight + ' src="' + url + '" controls="controls" type="video/mp4">';
        code += '<img src="' + data['Preview'] + '" />';
        code += '</video></center>';

        $("#fileinfo img").remove();
        $('#fileinfo #preview h1').before(code);

        var ext = getExtension(data['Filename']);

        jwplayer("myVideo").setup(
        {
            file: url,
            type: ext,
            primary: "flash",
            startparam: "start"
        });
    };

    //Return HTML audio player 
    var getAudioPlayer = function (data) {


        /*if (config.options.serverRoot) {
            
            var url = config.options.fileRoot + data['Path'].substr(fileRoot.length, data['Path'].length - fileRoot.length);            
            
        } else {*/
        var url = "connectors/ashx/filemanager.ashx?mode=redirect&path=" + encodeURIComponent(data['Path']);
        //}

        var code = '<center><audio src="' + data['Path'] + '" id = "myAudio" controls="controls">';
        code += '<img src="' + data['Preview'] + '" />';
        code += '</audio></center>';

        $("#fileinfo img").remove();
        $('#fileinfo #preview h1').before(code);

        var ext = getExtension(data['Filename']);

        jwplayer("myAudio").setup(
          {
              file: url,
              type: ext,
              primary: "flash",
              startparam: "start"
          });

        //$("#myAudio_wrapper").css("text-align", "center");

    };


    // Display icons on list view 
    // retrieving them from filetree
    // Called using SetInterval
    var display_icons = function (timer) {
        $('#fileinfo').find('td:first-child').each(function () {
            var path = $(this).attr('data-path');
            //var my = path.substr(0, path.length - 3);
            var treenode = $('#filetree').find('a[data-path="' + path + '"]').parent();

            if (typeof treenode.css('background-image') !== "undefined") {
                $(this).css('background-image', treenode.css('background-image'));
                window.clearInterval(timer);
            }

        });
    };

    // Sets the folder status, upload, and new folder functions 
    // to the path specified. Called on initial page load and 
    // whenever a new directory is selected.
    var setUploader = function (path) {
        $('#currentpath').val(path);
        $('#uploader h1').text(lg.current_folder + displayPath(path)).attr('title', displayPath(path, false)).attr('data-path', path);

        $('#newfolder').unbind().click(function () {
            var foldername = lg.default_foldername;
            var msg = lg.prompt_foldername + ' : <input id="fname" name="fname" type="text" value="' + foldername + '" />';

            var getFolderName = function (v, m) {
                if (v != 1) return false;
                var fname = m.children('#fname').val();

                if (fname != '') {
                    foldername = cleanString(fname);
                    var d = new Date(); // to prevent IE cache issues
                    $.getJSON(fileConnector + '?mode=addfolder&path=' + encodeURIComponent($('#currentpath').val()) + '&name=' + encodeURIComponent(foldername) + '&time=' + d.getMilliseconds(), function (result) {
                        if (result['Code'] == 0) {
                            if (treaArrayList) {
                                addFolder(result['Parent'], result['Name']);
                            } else {
                                addFolderServer(result['Parent'], result['Name']);
                            }
                            getFolderInfo(result['Parent']);

                            // seems to be necessary when dealing w/ files located on s3 (need to look into a cleaner solution going forward)
                            $('#filetree').find('a[data-path="' + result['Parent'] + '/"]').click().click();
                        } else {
                            $.prompt(lg.DIRECTORY_ALREADY_EXISTS);
                        }
                    });
                } else {
                    $.prompt(lg.no_foldername);
                }
            };
            var btns = {};
            btns[lg.create_folder] = true;
            btns[lg.cancel] = false;
            $.prompt(msg, {
                callback: getFolderName,
                buttons: btns
            });
        });
    };

    // Binds specific actions to the toolbar in detail views.
    // Called when detail views are loaded.
    var bindToolbar = function (data) {

        // this little bit is purely cosmetic
        $("#fileinfo button").each(function (index) {
            // check if span doesn't exist yet, when bindToolbar called from renameItem for example
            if ($(this).find('span').length == 0)
                $(this).wrapInner('<span></span>');
        });

        if (!has_capability(data, 'select')) {
            $('#fileinfo').find('button#select').hide();
        } else {
            $('#fileinfo').find('button#select').click(function () { selectItem(data); }).show();
            if (window.opener || window.tinyMCEPopup) {
                $('#preview img').attr('title', lg.select);
                $('#preview img').click(function () { selectItem(data); }).css("cursor", "pointer");
            }
        }

        if (!has_capability(data, 'rename')) {
            $('#fileinfo').find('button#rename').hide();
        } else {
            $('#fileinfo').find('button#rename').click(function () {
                var newName = renameItem(data);
                if (newName.length) $('#fileinfo > h1').text(newName);
            }).show();
        }

        if (!has_capability(data, 'move')) {
            $('#fileinfo').find('button#move').hide();
        } else {
            $('#fileinfo').find('button#move').click(function () {
                var newName = moveItem(data);
                if (newName.length) $('#fileinfo > h1').text(newName);
            }).show();
        }

        // @todo 
        if (!has_capability(data, 'replace')) {
            $('#fileinfo').find('button#replace').hide();
        } else {
            $('#fileinfo').find('button#replace').click(function () {
                replaceItem(data);
            }).show();
        }

        if (!has_capability(data, 'delete')) {
            $('#fileinfo').find('button#delete').hide();
        } else {
            $('#fileinfo').find('button#delete').click(function () {
                if (deleteItem(data)) $('#fileinfo').html('<h1>' + lg.select_from_left + '</h1>');
            }).show();
        }

        if (!has_capability(data, 'edit')) {
            $('#fileinfo').find('button#edit').hide();
        } else {
            $('#fileinfo').find('button#edit').click(function () {
                editItem(data);
            }).show();
        }

        if (!has_capability(data, 'download')) {
            $('#fileinfo').find('button#download').hide();
        } else {
            $('#fileinfo').find('button#download').click(function () {
                window.location = fileConnector + '?mode=download&path=' + encodeURIComponent(data['Path']);
            }).show();
        }
    };

    //Create FileTree and bind elements
    //called during initialization and also when adding a file 
    //directly in root folder (via addNode)    


    var panSearch = true;

    var createFileTree = function () {

        if (config.options.serverMode) {
            config.options.expandedFolder = "";
        } else {
            config.options.expandedFolder = "All";
        }

        // Creates file tree.
        $('#filetree').fileTree({
            root: fileRoot,
            datafunc: config.options.serverMode ? populateFileTree : populateFileTree2,
            multiFolder: true,
            folderCallback: function (path) {
                getFolderInfo(path);
            },
            expandedFolder: config.options.expandedFolder,
            server: config.options.serverMode,
            after: function (data) {

                updateTrue = true;

                $('#filetree').find('li a').each(function () {
                    $(this).contextMenu(
                        { menu: getContextMenuOptions($(this)) },
                        function (action, el, pos) {
                            var path = $(el).attr('data-path');
                            setMenus(action, path);
                        }
                    );
                });
                //Search function
                if (config.options.searchBox == true) {

                    if (panSearch) {
                        $('#q').liveUpdate('#filetree ul', 1).blur();
                    } else {
                        $('#q').liveUpdate('#filetree ul', 2).blur();
                    }
                    $('#search span.q-inactive').html(lg.search);
                    $('#search a.q-reset').attr('title', lg.search_reset);
                }
            }
        }, function (file) {
            getFileInfo(file);
        });

    };


    /*---------------------------------------------------------
      Item Actions
    ---------------------------------------------------------*/

    // Calls the SetUrl function for FCKEditor compatibility,
    // passes file path, dimensions, and alt text back to the
    // opening window. Triggered by clicking the "Select" 
    // button in detail views or choosing the "Select"
    // contextual menu option in list views. 
    // NOTE: closes the window when finished.
    var selectItem = function (data) {
        if (config.options.relPath !== false) {
            var url = relPath + data['Path'].replace(fileRoot, "");
        } else {
            var url = relPath + data['Path'];
        }

        if (window.opener || window.tinyMCEPopup || $.urlParam('field_name') || $.urlParam('CKEditorCleanUpFuncNum') || $.urlParam('CKEditor')) {
            if (window.tinyMCEPopup) {
                // use TinyMCE > 3.0 integration method
                var win = tinyMCEPopup.getWindowArg("window");
                win.document.getElementById(tinyMCEPopup.getWindowArg("input")).value = url;
                if (typeof (win.ImageDialog) != "undefined") {
                    // Update image dimensions
                    if (win.ImageDialog.getImageData)
                        win.ImageDialog.getImageData();

                    // Preview if necessary
                    if (win.ImageDialog.showPreviewImage)
                        win.ImageDialog.showPreviewImage(url);
                }
                tinyMCEPopup.close();
                return;
            }
            // tinymce 4 and colorbox
            if ($.urlParam('field_name')) {
                parent.document.getElementById($.urlParam('field_name')).value = url;

                if (typeof parent.tinyMCE !== "undefined") {
                    parent.tinyMCE.activeEditor.windowManager.close();
                }
                if (typeof parent.$.fn.colorbox !== "undefined") {
                    parent.$.fn.colorbox.close();
                }
            }

            else if ($.urlParam('CKEditor')) {
                // use CKEditor 3.0 + integration method
                if (window.opener) {
                    // Popup
                    window.opener.CKEDITOR.tools.callFunction($.urlParam('CKEditorFuncNum'), url);
                } else {
                    // Modal (in iframe)
                    parent.CKEDITOR.tools.callFunction($.urlParam('CKEditorFuncNum'), url);
                    parent.CKEDITOR.tools.callFunction($.urlParam('CKEditorCleanUpFuncNum'));
                }
            } else {
                // use FCKEditor 2.0 integration method
                if (data['Properties']['Width'] != '') {
                    var p = url;
                    var w = data['Properties']['Width'];
                    var h = data['Properties']['Height'];
                    window.opener.SetUrl(p, w, h);
                } else {
                    window.opener.SetUrl(url);
                }
            }

            if (window.opener) {
                window.close();
            }
        } else {
            $.prompt(lg.fck_select_integration);
        }
    };

    var updateFolder = function (path) {

        if (path == null) {
            path = $('#currentpath').val();
        }

        if (!config.options.serverMode) {

            var d = new Date(); // to prevent IE cache issues
            var url = fileConnector + '?path=' + encodeURIComponent(path) + '&mode=getfolder&showThumbs=' + config.options.showThumbs + '&time=' + d.getMilliseconds() + '&useFileTable=' + config.options.useFileTable;
            if ($.urlParam('type')) url += '&type=' + $.urlParam('type');

            $.get(url, function (val) {

                var result = eval('(' + val + ')');

                var thisNode = $('#filetree').find('a[data-path="' + path + '"]');
                var parentNode = thisNode.next();

                if (path == fileRoot) {
                    parentNode = $('#filetree > ul.jqueryFileTree');
                    parentNode.children(".file").remove();

                } else {
                    parentNode.children(".file").remove();
                }

                parentNode = parentNode.parent();

                for (key in treaArrayList[path]) {
                    if (key.lastIndexOf('/') != key.length - 1) {

                        delete treaArrayList[path][key];
                    }
                }

                delete result["Code"];
                delete result["Path"];

                for (key in result) {
                    if (key.lastIndexOf('/') != key.length - 1) {

                        treaArrayList[path][key] = result[key];
                        treaArrayList[key + "/"] = {};

                        var ext = getExtension(result[key]["Filename"]);

                        var newNode = '<li class="file ext_' + ext + '"><a data-path="' + result[key]["Path"] + '" href="#" id = \"' + generator.getID("id") + '\"class="">' + result[key]["Filename"] + '</a></li>';

                        // if is root folder
                        // TODO optimize
                        if (path == fileRoot) {
                            parentNode = $('#filetree > ul.jqueryFileTree');

                            parentNode.append(newNode);

                        } else {
                            parentNode.children('ul').append(newNode);
                        }


                        $('#filetree').find('li a[data-path="' + result[key]["Path"] + '"]').attr('class', 'cap_edit cap_download cap_rename cap_delete').each(function () {
                            $(this).contextMenu(
                                { menu: getContextMenuOptions($(this)) },
                                function (action, el, pos) {
                                    var path = $(el).attr('data-path');
                                    setMenus(action, path);
                                });
                        });
                    }
                }

                if (path != fileRoot) {

                    thisNode = $('#filetree').find('a[data-path="' + path + '"]');
                } else {
                    thisNode = parentNode;
                }

                thisNode.trigger("updateTree");

                getFolderInfo(path);

            });
        } else {
            var ext = getExtension(name);
            var thisNode = $('#filetree').find('a[data-path="' + path + '"]');
            var parentNode = thisNode.parent();
            //var newNode = '<li class="file ext_' + ext + '"><a data-path="' + path + name + '" href="#" class="">' + name + '</a></li>';

            // if is root folder
            // TODO optimize
            if (path == fileRoot) {
                //parentNode = $('#filetree').find('ul.jqueryFileTree');

                //parentNode.prepend(newNode);
                createFileTree();

            } else {
                //parentNode.find('ul').prepend(newNode);
                thisNode.click().click();
            }

            getFolderInfo(path); // update list in main window

            if (config.options.showConfirmation) $.prompt(lg.successful_added_file);
        }
    }

    // Renames the current item and returns the new name.
    // Called by clicking the "Rename" button in detail views
    // or choosing the "Rename" contextual menu option in 
    // list views.
    var renameItem = function (data) {
        var finalName = '';
        var fileName = config.security.allowChangeExtensions ? data['Filename'] : getFilename(data['Filename']);
        var msg = lg.new_filename + ' : <input id="rname" name="rname" type="text" value="' + fileName + '" />';

        var getNewName = function (v, m) {
            if (v != 1) return false;
            rname = m.children('#rname').val();

            if (rname != '') {

                var givenName = rname;

                if (!config.security.allowChangeExtensions) {
                    givenName = nameFormat(rname);
                    var suffix = getExtension(data['Filename']);
                    if (suffix.length > 0) {
                        givenName = givenName + '.' + suffix;
                    }
                }

                // Check if file extension is allowed
                if (!isAuthorizedFile(givenName)) {
                    var str = '<p>' + lg.INVALID_FILE_TYPE + '</p>';
                    if (config.security.uploadPolicy == 'DISALLOW_ALL') {
                        str += '<p>' + lg.ALLOWED_FILE_TYPE + config.security.uploadRestrictions.join(', ') + '.</p>';
                    }
                    if (config.security.uploadPolicy == 'ALLOW_ALL') {
                        str += '<p>' + lg.DISALLOWED_FILE_TYPE + config.security.uploadRestrictions.join(', ') + '.</p>';
                    }
                    $("#filepath").val('');
                    $.prompt(str);
                    return false;
                }

                var oldPath = data['Path'];
                if (data['Filename'] != givenName) {
                    var connectString = fileConnector + '?mode=rename&old=' + encodeURIComponent(data['Path']) + '&new=' + encodeURIComponent(givenName);

                    $.ajax({
                        type: 'GET',
                        url: connectString,
                        dataType: 'json',
                        async: false,
                        success: function (result) {
                            if (result['Code'] == 0) {
                                var newPath = result['New Path'];
                                var newName = result['New Name'];

                                if (treaArrayList) {
                                    updateNode(oldPath, newPath, newName);
                                } else {
                                    updateNodeServer(oldPath, newPath, newName);
                                }

                                var title = $("#preview h1").attr("title");

                                if (typeof title != "undefined" && title == oldPath) {
                                    $('#preview h1').text(newName);
                                }

                                if ($('#fileinfo').data('view') == 'grid') {
                                    $('#fileinfo img[data-path="' + oldPath + '"]').parent().next('p').text(newName);
                                    $('#fileinfo img[data-path="' + oldPath + '"]').attr('data-path', newPath);
                                } else {
                                    $('#fileinfo td[data-path="' + oldPath + '"]').text(newName);
                                    $('#fileinfo td[data-path="' + oldPath + '"]').attr('data-path', newPath);
                                }
                                $("#preview h1").html(newName);

                                // actualized data for binding
                                data['Path'] = newPath;
                                data['Filename'] = newName;

                                // Bind toolbar functions.
                                $('#fileinfo').find('button#edit,button#rename, button#delete, button#download').unbind();
                                bindToolbar(data);

                                if (config.options.showConfirmation) $.prompt(lg.successful_rename);

                                var path = $('#currentpath').val();
                                if ($("#modeFileInfo").val() == "1") {
                                    getFileInfo(newPath);
                                }
                            }

                            if (result['Code'] == -1) {
                                $.prompt(lg.ERROR_RENAMING_FILE);
                                updateFolder();
                            }

                            if (result['Code'] == -2) {

                                $.prompt(lg.ERROR_RENAMING_DIRECTORY);

                                $('#update').trigger("click");
                            }

                            if (result['Code'] == -3) {

                                $.prompt(lg.DIRECTORY_ALREADY_EXISTS);
                            }

                            if (result['Code'] == -4) {

                                $.prompt(lg.FILE_ALREADY_EXISTS2);
                            }

                            finalName = result['New Name'];
                        }
                    });
                }
            }
        };
        var btns = {};
        btns[lg.rename] = true;
        btns[lg.cancel] = false;
        $.prompt(msg, {
            callback: getNewName,
            buttons: btns
        });

        return finalName;
    };

    // Replace the current file and keep the same name.
    // Called by clicking the "Replace" button in detail views
    // or choosing the "Replace" contextual menu option in
    // list views.
    var replaceItem = function (data) {

        // remove dynamic form if already exists
        //$('#file-replacement').remove();

        // we create a dynamic form with input File
        //	$form = $('<form id="file-replacement" method="post">');
        //	$form.append('<input id="fileR" name="fileR" type="file" />');
        //	$form.append('<input id="mode" name="mode" type="hidden" value="replace" /> ');
        //	$form.append('<input id="newfilepath" name="newfilepath" type="hidden" value="' + data["Path"] + '" />');
        //	$('body').prepend($form);

        // we auto-submit form when user filled it up
        $('#fileR').bind('change', function () {
            $(this).closest("form#toolbar").submit();
        });

        // we set the connector to send data to
        $('#toolbar').attr('action', fileConnector);
        $('#toolbar').attr('method', 'post');

        // submission script
        $('#toolbar').ajaxForm({
            target: '#uploadresponse',
            beforeSubmit: function (arr, form, options) {

                var newFile = $('#fileR', form).val();

                // Test if a value is given
                if (newFile == '') {
                    return false;
                }

                // Check if file extension is matching with the original
                if (getExtension(newFile) != data["File Type"]) {
                    $.prompt(lg.ERROR_REPLACING_FILE + " ." + getExtension(data["Filename"]));
                    return false;
                }
                $('#replace').attr('disabled', true);
                $('#upload span').addClass('loading').text(lg.loading_data);

                // if config.upload.fileSizeLimit == auto we delegate size test to connector
                if (typeof FileReader !== "undefined" && typeof config.upload.fileSizeLimit != "auto") {
                    // Check file size using html5 FileReader API
                    var size = $('#fileR', form).get(0).files[0].size;
                    if (size > config.upload.fileSizeLimit * 1024 * 1024) {
                        $.prompt("<p>" + lg.file_too_big + "</p><p>" + lg.file_size_limit + config.upload.fileSizeLimit + " " + lg.mb + ".</p>");
                        $('#upload').removeAttr('disabled').find("span").removeClass('loading').text(lg.upload);
                        return false;
                    }
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $('#upload').removeAttr('disabled').find("span").removeClass('loading').text(lg.upload);
                $.prompt(lg.ERROR_UPLOADING_FILE);
            },
            success: function (result) {
                var data = jQuery.parseJSON($('#uploadresponse').find('textarea').text());

                if (data['Code'] == 0) {
                    var fullpath = data["Path"] + '/' + data["Name"];

                    // Reloading file info
                    getFileInfo(fullpath);
                    // Visual effects for user to see action is successful
                    $('#preview').find('img').hide().fadeIn('slow'); // on right panel                
                    $('ul.jqueryFileTree').find('li a[data-path="' + fullpath + '"]').parent().hide().fadeIn('slow'); // on fileTree

                    if (config.options.showConfirmation) $.prompt(lg.successful_replace);

                } else {
                    $.prompt(data['Error']);
                }
                $('#replace').removeAttr('disabled');
                $('#upload span').removeClass('loading').text(lg.upload);
            }
        });

        // we pass data path value - original file
        $('#newfilepath').val(data["Path"]);

        // we open the input file dialog window
        $('#fileR').click();
    };

    // Move the current item to specified dir and returns the new name.
    // Called by clicking the "Move" button in detail views
    // or choosing the "Move" contextual menu option in
    // list views.
    var moveItem = function (data) {
        var finalName = '';
        var msg = lg.move + ' : <input id="rname" name="rname" type="text" value="" />';

        var doMove = function (v, m) {
            if (v != 1) return false;
            rname = m.children('#rname').val();

            if (rname != '') {
                var givenName = rname;
                var oldPath = data['Path'];
                var connectString = fileConnector + '?mode=move&old=' + encodeURIComponent(data['Path']) + '&new=' + encodeURIComponent(givenName) + '&root=' + encodeURIComponent(fileRoot);

                $.ajax({
                    type: 'GET',
                    url: connectString,
                    dataType: 'json',
                    async: false,
                    success: function (result) {
                        if (result['Code'] == 0) {
                            var newPath = result['New Path'];
                            var newName = result['New Name'];

                            // we set fullexpandedFolder value to automatically open file in 
                            // filetree when calling createFileTree() function
                            fullexpandedFolder = newPath;

                            createFileTree();
                            getFolderInfo(newPath); // update list in main window

                            if (config.options.showConfirmation) $.prompt(lg.successful_moved);
                        } else {
                            $.prompt(result['Error']);
                        }

                        finalName = newPath + newName;
                    }
                });
            }
        };
        var btns = {};
        btns[lg.move] = true;
        btns[lg.cancel] = false;
        $.prompt(msg, {
            callback: doMove,
            buttons: btns
        });

        return finalName;
    };

    // Prompts for confirmation, then deletes the current item.
    // Called by clicking the "Delete" button in detail views
    // or choosing the "Delete contextual menu item in list views.
    var deleteItem = function (data) {
        var isDeleted = false;
        var msg = lg.confirmation_delete;

        var doDelete = function (v, m) {
            if (v != 1) return false;
            var d = new Date(); // to prevent IE cache issues
            var connectString = fileConnector + '?mode=delete&path=' + encodeURIComponent(data['Path']) + '&time=' + d.getMilliseconds(),
            parent = data['Path'].split('/').reverse().slice(1).reverse().join('/') + '/';

            $.ajax({
                type: 'GET',
                url: connectString,
                dataType: 'json',
                async: false,
                success: function (result) {
                    if (result['Code'] == 0) {

                        if (treaArrayList) {

                            var path = result['Path'];
                            var str = path.substr(0, path.length - 1)
                            var parent = str.substr(0, str.lastIndexOf('/') + 1);

                            delete treaArrayList[path];

                            if (!treaArrayList[parent][path]) {
                                delete treaArrayList[parent][path.substr(0, path.length - 1)];

                            } else {
                                delete treaArrayList[parent][path];
                            }
                        }

                        removeNode(result['Path']);
                        var rootpath = result['Path'].substring(0, result['Path'].length - 1); // removing the last slash
                        rootpath = rootpath.substr(0, rootpath.lastIndexOf('/') + 1);
                        $('#uploader h1').text(lg.current_folder + displayPath(rootpath)).attr("title", displayPath(rootpath, false)).attr('data-path', rootpath);
                        isDeleted = true;

                        if (config.options.showConfirmation) $.prompt(lg.successful_delete);

                        // seems to be necessary when dealing w/ files located on s3 (need to look into a cleaner solution going forward)
                        $('#filetree').find('a[data-path="' + parent + '/"]').click().click();
                    } else {
                        isDeleted = false;
                        $.prompt(result['Error']);
                    }
                }
            });
        };
        var btns = {};
        btns[lg.yes] = true;
        btns[lg.no] = false;
        $.prompt(msg, {
            callback: doDelete,
            buttons: btns
        });

        return isDeleted;
    };

    // Display an 'edit' link for editable files
    // Then let user change the content of the file
    // Save action is handled by the method using ajax
    var editItem = function (data) {

        isEdited = false;

        $('#fileinfo').find('h1').append(' <a id="edit-file" href="#" title="' + lg.edit + '"><span>' + lg.edit + '</span></a>');

        $('#edit-file').click(function () {

            //$('#fileinfo').find('iframe').hide();

            $(this).hide(); // hiding Edit link

            var d = new Date(); // to prevent IE cache issues
            var connectString = fileConnector + '?mode=editfile&path=' + encodeURIComponent(data['Path']) + '&time=' + d.getMilliseconds();

            $.getJSON(connectString, function (result) {

                if (result['Code'] == -1) {

                    $.prompt(lg.ERROR_RENAMING_FILE);

                    updateFolder();

                    return;
                }

                if (result['Code'] == -2) {

                    $.prompt(lg.ERROR_RENAMING_DIRECTORY);

                    $('#update').trigger("click");

                    return;
                }            

                if (result['Code'] == 0) {

                    var url = result['url'];
                    var fileId = result['fileId'];

                    var contentBox = $("#fileinfo");

                    var width = parseInt(contentBox.css("width").replace("px", "")) - 50;
                    var height = parseInt(contentBox.css("height").replace("px", "")) - 50;

                    var content = '<form id="edit-form">';                    
                    content += '<input type="hidden" name="mode" value="savefile" />';
                    content += '<input type="hidden" name="fileId" value="' + fileId + '" />';
                    content += '<input type="hidden" name="path" value="' + data['Path'] + '" />';
                    content += '<button id="edit-cancel" class="edition" class="button" type="button">' + lg.quit_editor + '</button>';
                    content += '<button id="edit-save" class="edition" class="button" type="button">' + lg.save + '</button>';
                    content += '</form>';

                    $('#preview').find('img').hide();
                    $('#preview').prepend(content).hide().fadeIn();

                    var urlOld = $('#fileinfo').find('iframe')[0].src;

                    $('#fileinfo').find('iframe').attr('src', url);

                    // Cancel Button Behavior
                    $('#edit-cancel').click(function () {
                        $('#preview').find('form#edit-form').hide();
                        $('#preview').find('img').fadeIn();
                        $('#edit-file').show();
                        $('#fileinfo').find('iframe').attr('src',urlOld);                                                
                    });

                    // Save Button Behavior
                    $('#edit-save').click(function () {             

                        var postData = $('#edit-form').serializeArray();

                        $.ajax({
                            type: 'POST',
                            url: fileConnector,
                            dataType: 'json',
                            data: postData,
                            async: false,
                            success: function (result) {
                                if (result['Code'] == 0) {
                                    isEdited = true;                                   
                                    $.prompt(lg.successful_edit);
                                    $('#preview').find('form#edit-form').hide();
                                    $('#preview').find('img').fadeIn();
                                    $('#edit-file').show();
                                    $('#fileinfo').find('iframe').attr('src', urlOld);
                                } else {
                                    isEdited = false;
                                    $.prompt(result['Error']);
                                }
                            }
                        });

                    });

                    // we instantiate codeMirror according to config options
                    //codeMirrorEditor = instantiateCodeMirror(getExtension(data['Path']), config);
                }
            });

        });

        return isEdited;
    };

    var editItemEditor = function (data) {

        isEdited = false;

        $('#fileinfo').find('h1').append(' <a id="edit-file" href="#" title="' + lg.edit + '"><span>' + lg.edit + '</span></a>');

        $('#edit-file').click(function () {

            $('#fileinfo').find('iframe').hide();

            $(this).hide(); // hiding Edit link

            var d = new Date(); // to prevent IE cache issues
            var connectString = fileConnector + '?mode=editfileEditor&path=' + encodeURIComponent(data['Path']) + '&time=' + d.getMilliseconds();

            $.getJSON(connectString, function (result) {

                if (result['Code'] == -1) {

                    $.prompt(lg.ERROR_RENAMING_FILE);

                    updateFolder();

                    return;
                }

                if (result['Code'] == -2) {

                    $.prompt(lg.ERROR_RENAMING_DIRECTORY);

                    $('#update').trigger("click");

                    return;
                }

                if (result['Code'] == 0) {

                    var text = ""
                    for (str in result['Content']) {

                        text += result['Content'][str] + "\r\n";
                    }

                    text = text.substr(0, text.length - 1);

                    var content = '<form id="edit-form">';
                    content += '<textarea id="edit-content" name="content" style="overflow:auto">' + text + '</textarea>';
                    content += '<input type="hidden" name="mode" value="savefileEditor" />';
                    content += '<input type="hidden" name="path" value="' + data['Path'] + '" />';
                    content += '<button id="edit-cancel" class="edition" class="button" type="button">' + lg.quit_editor + '</button>';
                    content += '<button id="edit-save" class="edition" class="button" type="button">' + lg.save + '</button>';
                    content += '</form>';

                    $('#preview').find('img').hide();
                    $('#preview').prepend(content).hide().fadeIn();

                    // Cancel Button Behavior
                    $('#edit-cancel').click(function () {
                        $('#preview').find('form#edit-form').hide();
                        $('#preview').find('img').fadeIn();
                        $('#edit-file').show();
                        $('#fileinfo').find('iframe').show();
                        $('#fileinfo').find('iframe')[0].src = $('#fileinfo').find('iframe')[0].src;
                    });

                    // Save Button Behavior
                    $('#edit-save').click(function () {

                        // we get new textarea content
                        var newcontent = codeMirrorEditor.getValue();
                        $("textarea#edit-content").val(newcontent);

                        var postData = $('#edit-form').serializeArray();

                        $.ajax({
                            type: 'POST',
                            url: fileConnector,
                            dataType: 'json',
                            data: postData,
                            async: false,
                            success: function (result) {
                                if (result['Code'] == 0) {
                                    isEdited = true;                                    
                                    $.prompt(lg.successful_edit);
                                    $('#preview').find('form#edit-form').hide();
                                    $('#preview').find('img').fadeIn();
                                    $('#edit-file').show();
                                    $('#fileinfo').find('iframe').show();
                                    $('#fileinfo').find('iframe')[0].src = $('#fileinfo').find('iframe')[0].src;
                                } else {
                                    isEdited = false;
                                    $.prompt(result['Error']);
                                }
                            }
                        });

                    });

                    // we instantiate codeMirror according to config options
                    codeMirrorEditor = instantiateCodeMirror(getExtension(data['Path']), config);
                }
            });

        });

        return isEdited;
    };

    /*---------------------------------------------------------
      Functions to Update the File Tree
    ---------------------------------------------------------*/

    var updateTree = function (path, name, func) {
        var d = new Date(); // to prevent IE cache issues
        var url = fileConnector + '?path=' + encodeURIComponent(path) + '&mode=getfolder&showThumbs=' + config.options.showThumbs + '&time=' + d.getMilliseconds() + '&useFileTable=' + config.options.useFileTable;
        if ($.urlParam('type')) url += '&type=' + $.urlParam('type');

        $.get(url, function (val) {

            var data = eval('(' + val + ')');

            treaArrayList[path] = data;

            treaArrayList[path + name + "/"] = {};

            func(path, name);

            getFolderInfo(path);

        });
    }

    // Updates the specified node with a new name. Called after
    // a successful rename operation.
    var updateNode = function (oldPath, newPath, newName) {

        for (key in treaArrayList) {

            var newKey = key.replace(oldPath, newPath);

            var memory = treaArrayList[key]
            delete treaArrayList[key];
            treaArrayList[newKey] = memory;

            for (key2 in treaArrayList[newKey]) {
                var newKey2 = key2.replace(oldPath, newPath);
                var memory = treaArrayList[newKey][key2];
                delete treaArrayList[newKey][key2];
                treaArrayList[newKey][newKey2] = memory;

                treaArrayList[newKey][newKey2]["Path"] = treaArrayList[newKey][newKey2]["Path"].replace(oldPath, newPath);
                treaArrayList[newKey][newKey2]["Preview"] = treaArrayList[newKey][newKey2]["Preview"].replace(oldPath, newPath);

                var str = treaArrayList[newKey][newKey2]["Path"];

                if (str.substr(str.length - 1, str.length) == "/") {
                    str = str.substr(0, str.length - 1);
                }

                var Name = str.substr(str.lastIndexOf("/") + 1, str.length);

                treaArrayList[newKey][newKey2]["Filename"] = Name;
            }
        }

        var thisNode = $('#filetree').find('a[data-path="' + oldPath + '"]');
        thisNode.attr('data-path', newPath).text(newName);

        thisNode.parent().find("a").each(function () {
            var str = $(this).attr('data-path');
            str = str.replace(oldPath, newPath);
            $(this).attr('data-path', str);

        });
    };

    var updateNodeServer = function (oldPath, newPath, newName) {
        var thisNode = $('#filetree').find('a[data-path="' + oldPath + '"]');
        var parentNode = thisNode.parent().parent().prev('a');
        thisNode.attr('data-path', newPath).text(newName);

        // we work directly on root folder
        // TODO optimize by binding only the renamed element
        if (parentNode.length == 0) {
            createFileTree();
        } else {
            parentNode.click().click();
        }
    };

    // Removes the specified node. Called after a successful 
    // delete operation.
    var removeNode = function (path) {

        $('#filetree')
                .find('a[data-path="' + path + '"]')
                .parent()
                .fadeOut('slow', function () {
                    $(this).remove();
                });
        // if the actual view is the deleted folder, we display parent folder
        if ($('#uploader h1').attr('data-path') == path) {
            var a = path.split('/');
            var parent = a.slice(0, length - 2).join('/') + '/';
            //treaArrayList[parent] = {};
            getFolderInfo(parent);
        }
        // grid case
        if ($('#fileinfo').data('view') == 'grid') {
            $('#contents img[data-path="' + path + '"]').parent().parent()
                .fadeOut('slow', function () {
                    $(this).remove();
                });
        }
            // list case
        else {
            $('table#contents')
                .find('td[data-path="' + path + '"]')
                .parent()
                .fadeOut('slow', function () {
                    $(this).remove();
                });
        }
        // remove fileinfo when item to remove is currently selected
        if ($('#preview').length) {
            getFolderInfo(path.substr(0, path.lastIndexOf('/') + 1));
        }
    };

    // Adds a new folder as the first item beneath the
    // specified parent node. Called after a new folder is
    // successfully created.
    var addFolder = function (parent, name) {
        updateTree(parent, name, addFolderMy);

        function addFolderMy(parent, name) {

            var newNode = '<li class="directory collapsed"><a data-path="' + parent + name + '/" href="#" id = \"' + generator.getID("id") + '\">' + name + '</a><ul class="jqueryFileTree" style="display: block;"></ul></li>';
            var parentNode = $('#filetree').find('a[data-path="' + parent + '"]');

            if (parent != fileRoot) {
                parentNode.next('ul').prepend(newNode).prev('a').trigger("updateTree");
            } else {
                $('#filetree > ul').prepend(newNode);
                $('#filetree').trigger("updateTree");
            }

            $('#filetree').find('li a[data-path="' + parent + name + '/"]').attr('class', 'cap_rename cap_delete').each(function () {
                $(this).contextMenu(
                    { menu: getContextMenuOptions($(this)) },
                    function (action, el, pos) {
                        var path = $(el).attr('data-path');
                        setMenus(action, path);
                    });
            });

            if (config.options.showConfirmation) $.prompt(lg.successful_added_folder);
        }
    };

    var addFolderServer = function (parent, name) {

        var newNode = '<li class="directory collapsed"><a data-path="' + parent + name + '/" href="#" id = \"' + generator.getID("id") + '\">' + name + '</a><ul class="jqueryFileTree" style="display: block;"></ul></li>';
        var parentNode = $('#filetree').find('a[data-path="' + parent + '"]');
        if (parent != config.options.fileRoot) {
            parentNode.next('ul').prepend(newNode).prev('a').click().click();
            parentNode.next('ul').prepend(newNode).prev('a').trigger("updateTree");
        } else {
            $('#filetree > ul').prepend(newNode);
            $('#filetree').find('li a[data-path="' + parent + name + '/"]').attr('class', 'cap_rename cap_delete').click(function () {
                getFolderInfo(parent + name + '/');
            }).each(function () {
                $(this).contextMenu(
					{ menu: getContextMenuOptions($(this)) },
					function (action, el, pos) {
					    var path = $(el).attr('data-path');
					    setMenus(action, path);
					});
            }
                );

            $('#filetree').trigger("updateTree");
        }

        if (config.options.showConfirmation) $.prompt(lg.successful_added_folder);

    };

    /*---------------------------------------------------------
      Functions to Retrieve File and Folder Details
    ---------------------------------------------------------*/

    // Decides whether to retrieve file or folder info based on
    // the path provided.
    var getDetailView = function (path) {
        if (path.lastIndexOf('/') == path.length - 1) {
            getFolderInfo(path);
            $('#filetree').find('a[data-path="' + path + '"]').click();
        } else {
            getFileInfo(path);
        }
    };

    function getContextMenuOptions(elem) {
        var optionsID = elem.attr('class').replace(/ /g, '_');
        if (optionsID == "") return 'itemOptions';
        if (!($('#' + optionsID).length)) {
            // Create a clone to itemOptions with menus specific to this element
            var newOptions = $('#itemOptions').clone().attr('id', optionsID);
            if (!elem.hasClass('cap_select')) $('.select', newOptions).remove();
            if (!elem.hasClass('cap_download')) $('.download', newOptions).remove();
            //if (!elem.hasClass('cap_edit')) $('.edit', newOptions).remove();
            if (!elem.hasClass('cap_rename')) $('.rename', newOptions).remove();
            if (!elem.hasClass('cap_move')) $('.move', newOptions).remove();
            $('.replace', newOptions).remove(); // we remove replace since it is not implemented on Opera + Chrome and works only if #preview panel is on on FF
            if (!elem.hasClass('cap_delete')) $('.delete', newOptions).remove();
            $('#itemOptions').after(newOptions);
        }
        return optionsID;
    }

    var setMenusShow = function (action, path, data) {
        if ($('#fileinfo').data('view') == 'grid') {
            var item = $('#fileinfo').find('img[data-path="' + data['Path'] + '"]').parent();
        } else {
            var item = $('#fileinfo').find('td[data-path="' + data['Path'] + '"]').parent();
        }

        switch (action) {
            case 'select':
                selectItem(data);
                break;

            case 'download':

                var d = new Date();

                url = fileConnector + '?mode=downloadCheck&path=' + encodeURIComponent(data['Path']) + '&user_id=' + get("user_id") + '&time=' + d.getMilliseconds();

                $.ajax({
                    type: 'GET',
                    url: url,
                    dataType: 'json',
                    async: false,
                    cache: false,
                    success: function (result) {

                        if (result['Code'] == 0) {

                            d = new Date();

                            window.location = fileConnector + '?mode=download&path=' + encodeURIComponent(data['Path']) + '&user_id=' + get("user_id") + '&time=' + d.getMilliseconds();
                        }

                        if (result['Code'] == -1) {

                            $.prompt(lg.ERROR_RENAMING_FILE);

                            var currentpath = result['Path'].substr(0, result['Path'].lastIndexOf('/') + 1);

                            updateFolder(currentpath);
                        }
                    }
                });
                break;

            case 'rename':
                var newName = renameItem(data);
                break;

            case 'replace':
                replaceItem(data);
                break;

            case 'move':
                var newName = moveItem(data);
                break;

            case 'delete':
                deleteItem(data);
                break;
        }
    }

    // Binds contextual menus to items in list and grid views.
    var setMenus = function (action, path) {

        var currentpath = path.substr(0, path.lastIndexOf('/') + 1);

        if (path.lastIndexOf('/') == path.length - 1) {
            var pathNew = path.substr(0, path.length - 1);
            currentpath = pathNew.substr(0, pathNew.lastIndexOf('/') + 1);
        }

        if (treaArrayList) {
            data = treaArrayList[currentpath][path];
            setMenusShow(action, path, data);
        } else {
            var d = new Date(); // to prevent IE cache issues
            $.get(fileConnector + '?mode=getinfo&path=' + encodeURIComponent(path) + '&time=' + d.getMilliseconds(), function (data) {

                var data = eval('(' + data + ')');

                if (data['Code'] == -2) {

                    $.prompt(lg.ERROR_RENAMING_DIRECTORY);

                    $('#update').trigger("click");
                }

                if (data['Code'] == -1) {
                    $.prompt(lg.ERROR_RENAMING_FILE);

                    var currentpath = data['Path'].substr(0, data['Path'].lastIndexOf('/') + 1);

                    $('#filetree').find('a[data-path="' + currentpath + '"]').click().click();
                }

                if (data['Code'] == 0) {
                    setMenusShow(action, path, data);
                }
            });
        }
    };

   

    var getFileInfoShow = function (data, file) {

        var currentpath = file.substr(0, file.lastIndexOf('/') + 1);

        var template = '<div id="preview"><img /><h1></h1><dl></dl></div>';

        if (isWebFile(data['Filename']) || isDocFile(data['Filename'])) {

            var contentBox = $("#fileinfo");

            var width = parseInt(contentBox.css("width").replace("px", "")) - 50;
            var height = parseInt(contentBox.css("height").replace("px", "")) - 50;

            template = '<div id="preview"><iframe width="' + width + '" height="' + height + '" scrolling="auto"></iframe><h1></h1><dl></dl></div>';            
            
        }        

        if (isImageFile(data['Filename'])) {

            template = '<div id="preview"><img /><h1></h1><dl></dl></div>';
        }


        template += '<form id="toolbar">';
        template += '<button id="parentfolder" class="button" type="button">' + lg.parentfolder + '</button>';
        //if ($.inArray('edit', capabilities) != -1) template += '<button class="button" id="edit" name="edit" type="button" value="Edit">' + lg.editFile + '</button>';
        if ($.inArray('select', capabilities) != -1 && ($.urlParam('CKEditor') || window.opener || window.tinyMCEPopup || $.urlParam('field_name'))) template += '<button id="select" class="button" name="select" type="button" value="Select">' + lg.select + '</button>';
        if ($.inArray('download', capabilities) != -1) template += '<button class="button" id="download" name="download" type="button" value="Download">' + lg.download + '</button>';
        if ($.inArray('rename', capabilities) != -1 && config.options.browseOnly != true) template += '<button class="button" id="rename" name="rename" type="button" value="Rename">' + lg.rename + '</button>';
        if ($.inArray('move', capabilities) != -1 && config.options.browseOnly != true) template += '<button class="button" id="move" name="move" type="button" value="Move">' + lg.move + '</button>';
        if ($.inArray('delete', capabilities) != -1 && config.options.browseOnly != true) template += '<button class="button" id="delete" name="delete" type="button" value="Delete">' + lg.del + '</button>';
        template += '</form>';

        $('#fileinfo').html(template);
        $('#parentfolder').click(function () {
            getFolderInfo(currentpath);
        });

        // Retrieve the data & populate the template.               

        

        if (data['Code'] == 0) {

            $('#fileinfo').find('h1').text(data['Filename']).attr('title', file);

            if (isWebFile(data['Filename'])) {

                var url = "connectors/ashx/filemanager.ashx?path=" + encodeURIComponent(file) + "&mode=redirect&view=true";

                $('#fileinfo').find('h1').html('<a href="#" onclick="window.open(\'' + url + '\',\'_blank\'); return false;">' + data['Filename'] + '</a>');

                $('#fileinfo').find('iframe').attr('src', url);
            }

            if (isDocFile(data['Filename'])) {                

                var docPath = location.protocol + '//' + location.host + "/Filemanager/connectors/ashx/filemanager.ashx?path=" + file + "&mode=redirect&view=true";

                var url ="http://docs.google.com/gview?url=" +encodeURIComponent(docPath) + "&embedded=true";

                $('#fileinfo').find('h1').html('<a href="#" onclick="window.open(\'' + 'http://docs.google.com/viewer?url=' + encodeURIComponent(docPath) + '\',\'_blank\'); return false;">' + data['Filename'] + '</a>');                

                $('#fileinfo').find('iframe').attr('src', url);
                
            }     
            

            if (isImageFile(data['Filename'])) {

                var url = "connectors/ashx/filemanager.ashx?path=" + encodeURIComponent(file) + "&mode=redirect&view=true";

                $('#fileinfo').find('img').attr('src', url);
            }


            if (!isImageFile(data['Filename']) && !isWebFile(data['Filename']) && !isDocFile(data['Filename'])) {

                if (data['Preview'].indexOf("connectors/ashx/filemanager.ashx") == -1) {

                    url = data['Preview'];

                    $('#fileinfo').find('img').attr('src', url);
                }
            }

            if (isVideoFile(data['Filename']) && config.videos.showVideoPlayer == true) {
                getVideoPlayer(data);
            }
            if (isAudioFile(data['Filename']) && config.audios.showAudioPlayer == true) {
                getAudioPlayer(data);
            }

            if (isEditableFile(data['Filename']) && config.edit.enabled == true) {
                editItem(data);
            }

            if (isEditableFileEditor(data['Filename']) && config.edit.enabled == true) {
                editItemEditor(data);
            }

            var properties = '';

            if (data['Properties']['Width'] && data['Properties']['Width'] != '') properties += '<dt>' + lg.dimensions + '</dt><dd>' + data['Properties']['Width'] + 'x' + data['Properties']['Height'] + '</dd>';
            if (data['Properties']['Date Created'] && data['Properties']['Date Created'] != '') properties += '<dt>' + lg.created + '</dt><dd>' + data['Properties']['Date Created'] + '</dd>';
            if (data['Properties']['Date Modified'] && data['Properties']['Date Modified']!=='') properties += '<dt>' + lg.modified + '</dt><dd>' + data['Properties']['Date Modified'] + '</dd>';
            if (data['Properties']['Size'] || parseInt(data['Properties']['Size']) == 0) properties += '<dt>' + lg.size + '</dt><dd>' + formatBytes(data['Properties']['Size']) + '</dd>';
            if (data['Properties']['User'] && data['Properties']['User'] != '') properties += '<dt>' + lg.user + '</dt><dd>' + data['Properties']['User'] + '</dd>';
            if (data['Properties']['UserCreate'] && data['Properties']['UserCreate'] != '') properties += '<dt>' + lg.user_create_document + '</dt><dd>' + data['Properties']['UserCreate'] + '</dd>';
            if (data['Properties']['DateDocument'] && data['Properties']['DateDocument'] != '') properties += '<dt>' + lg.date_document + '</dt><dd>' + data['Properties']['DateDocument'] + '</dd>';
            $('#fileinfo').find('dl').html(properties);

            errorImage();

            // Bind toolbar functions.
            bindToolbar(data);
        } else {
            $.prompt(data['Error']);
        }
        
    };

    var errorImage = function () {
        $("img").error(function () {
            //alert("error"); 

            var str = $(this).attr("src");

            if (str.indexOf("mode=redirect") != -1) {
                var url = '/Filemanager/connectors/ashx/filemanager.ashx?currentpath=' + encodeURIComponent($(this).attr("src")) + '&mode=checkPath'

                $(this).attr("src", "./images/fileicons/default.png");

                $.ajax({
                    type: 'GET',
                    url: url,
                    dataType: 'json',
                    async: false,
                    cache: false,
                    success: function (result) {

                        if (result['Code'] == -2) {

                            $.prompt(lg.ERROR_RENAMING_DIRECTORY);

                            $('#update').trigger("click");
                        }

                        if (result['Code'] == -1) {

                            $.prompt(lg.ERROR_RENAMING_FILE);

                            updateFolder();
                        }
                    }
                });

            } else {
                $(this).attr("src", "./images/fileicons/default.png");
            }
        });
    }

    var getFolderInfoShow = function (data) {

        $("#modeFileInfo").val("0");

        var result = '';

        // Is there any error or user is unauthorized?
        if (data.Code == '-1') {
            handleError(data.Error);
            return;
        };

        if (data) {
            if ($('#fileinfo').data('view') == 'grid') {
                result += '<ul id="contents" class="grid">';

                for (key in data) {
                    var props = data[key]['Properties'];
                    var cap_classes = "";
                    for (cap in capabilities) {
                        if (has_capability(data[key], capabilities[cap])) {
                            cap_classes += " cap_" + capabilities[cap];
                        }
                    }

                    var scaledWidth = 64;
                    var actualWidth = props['Width'];
                    if (actualWidth > 1 && actualWidth < scaledWidth) scaledWidth = actualWidth;

                    config.options.showTitleAttr ? title = ' title="' + data[key]['Path'] + '"' : title = '';

                    var user = ""
                    if (data[key]['Properties']['User'] && data[key]['Properties']['User'] != "") {
                        user = data[key]['Properties']['User'];
                    }

                    var imgUrl = data[key]['Preview'];

                    if (data[key]['Preview'].indexOf(config.icons.path) == -1) {

                        imgUrl += '&view=false';
                    }

                    result += '<li class="' + cap_classes + '"' + title + '"><div class="clip"><img src="' + imgUrl + '" width="' + scaledWidth + '" alt="' + data[key]['Path'] + '" data-path="' + data[key]['Path'] + '" /></div><p>' + data[key]['Filename'] + '</p>' + '<p>' + user + '</p>';
                    if (props['Width'] && props['Width'] != '') result += '<span class="meta dimensions">' + props['Width'] + 'x' + props['Height'] + '</span>';
                    if (props['Size'] && props['Size']!=='') result += '<span class="meta size">' + props['Size'] + '</span>';
                    if (props['Date Created'] && props['Date Created'] != '') result += '<span class="meta created">' + props['Date Created'] + '</span>';
                    if (props['Date Modified'] && props['Date Modified'] != '') result += '<span class="meta modified">' + props['Date Modified'] + '</span>';
                    result += '</li>';
                }

                result += '</ul>';
            } else {
                result += '<table id="contents" class="list">';
                result += '<thead><tr><th class="headerSortDown"><span>' + lg.name +
                    '</span></th>'/*'<th><span>' + lg.dimensions + '</span></th>'*/ + '<th><span>' + lg.size +
                    '</span></th><th><span>' + lg.modified + '</span></th>' +
                    (config.options.useFileTable ? '<th style="color:green"><span>' + lg.user + '</span></th>' : '') +
                    (config.options.useFileTable ? '<th style="color:green"><span>' + lg.user_create_document + '</span></th>' : '') +
                    (config.options.useFileTable ? '<th style="color:green"><span>' + lg.date_document + '</span></th>' : '') +
                    '</tr></thead>';
                result += '<tbody>';

                for (key in data) {
                    var path = data[key]['Path'];
                    var props = data[key]['Properties'];
                    var cap_classes = "";
                    config.options.showTitleAttr ? title = ' title="' + data[key]['Path'] + '"' : title = '';

                    for (cap in capabilities) {
                        if (has_capability(data[key], capabilities[cap])) {
                            cap_classes += " cap_" + capabilities[cap];
                        }
                    }
                    result += '<tr class="' + cap_classes + '">';
                    result += '<td data-path="' + data[key]['Path'] + '"' + title + '">' + data[key]['Filename'] + '</td>';

                    /*if (props['Width'] && props['Width'] != '') {
                        result += ('<td>' + props['Width'] + 'x' + props['Height'] + '</td>');
                    } else {
                        result += '<td></td>';
                    }*/

                    if (props['Size'] && props['Size'] != '') {
                        result += '<td><abbr title="' + props['Size'] + '">' + formatBytes(props['Size']) + '</abbr></td>';
                    } else {
                        result += '<td></td>';
                    }

                    if (props['Date Modified'] && props['Date Modified'] != '') {
                        result += '<td>' + props['Date Modified'] + '</td>';
                    } else {
                        result += '<td></td>';
                    }

                    if (props['User'] && props['User'] != '') {
                        result += '<td>' + props['User'] + '</td>';
                    } else {
                        result += '<td></td>';
                    }

                    if (props['UserCreate'] && props['UserCreate'] != '') {
                        result += '<td>' + props['UserCreate'] + '</td>';
                    } else {
                        result += '<td></td>';
                    }

                    if (props['DateDocument'] && props['DateDocument'] != '') {
                        result += '<td>' + props['DateDocument'] + '</td>';
                    } else {
                        result += '<td></td>';
                    }

                    result += '</tr>';
                }

                result += '</tbody>';
                result += '</table>';
            }
        } else {
            result += '<h1>' + lg.could_not_retrieve_folder + '</h1>';
        }

        // Add the new markup to the DOM.
        $('#fileinfo').html(result);

        errorImage();

        // Bind click events to create detail views and add
        // contextual menu options.
        if ($('#fileinfo').data('view') == 'grid') {
            $('#fileinfo').find('#contents li').click(function () {
                var path = $(this).find('img').attr('data-path');
                getDetailView(path);
            }).each(function () {
                $(this).contextMenu(
                    { menu: getContextMenuOptions($(this)) },
                    function (action, el, pos) {
                        var path = $(el).find('img').attr('data-path');
                        setMenus(action, path);
                    }
                );
            });
        } else {
            $('#fileinfo tbody tr').click(function () {
                var path = $('td:first-child', this).attr('data-path');
                getDetailView(path);
            }).each(function () {
                $(this).contextMenu(
                    { menu: getContextMenuOptions($(this)) },
                    function (action, el, pos) {
                        var path = $('td:first-child', el).attr('data-path');
                        setMenus(action, path);
                    }
                );
            });

            $('#fileinfo').find('table').tablesorter({
                textExtraction: function (node) {
                    if ($(node).find('abbr').size()) {
                        return $(node).find('abbr').attr('title');
                    } else {
                        return node.innerHTML;
                    }
                }
            });
            // Calling display_icons() function
            // to get icons from filteree
            // Necessary to fix bug #170
            // https://github.com/simogeo/Filemanager/issues/170

            display_icons();
            var timer = setInterval(function () { display_icons(timer) }, 300);

        }
    }

    // Retrieves information about the specified file as a JSON
    // object and uses that data to populate a template for
    // detail views. Binds the toolbar for that detail view to
    // enable specific actions. Called whenever an item is
    // clicked in the file tree or list views.
    var getFileInfo = function (file) {
        // Update location for status, upload, & new folder functions.        
        $("#modeFileInfo").val("1");

        var currentpath = file.substr(0, file.lastIndexOf('/') + 1);
        setUploader(currentpath);

        // Include the template.

        if (treaArrayList) {
            data = treaArrayList[currentpath][file];
            getFileInfoShow(data, file);
        } else {

            var d = new Date(); // to prevent IE cache issues
            $.getJSON(fileConnector + '?mode=getinfo&path=' + encodeURIComponent(file) + '&time=' + d.getMilliseconds(), function (data) {
                if (data['Code'] == -2) {

                    $.prompt(lg.ERROR_RENAMING_DIRECTORY);

                    $('#update').trigger("click");

                    return;
                }

                if (data['Code'] == -1) {

                    $.prompt(lg.ERROR_RENAMING_FILE);

                    var currentpath = data['Path'].substr(0, data['Path'].lastIndexOf('/') + 1);

                    $('#filetree').find('a[data-path="' + currentpath + '"]').click().click();


                    /*if (oldPath.lastIndexOf('/') == oldPath.length - 1) {
                        var pathNew = oldPath.substr(0, oldPath.length - 1);
                        currentpath = pathNew.substr(0, pathNew.lastIndexOf('/') + 1);
                    }*/

                    return;
                }

                if (data['Code'] == 0) {

                    getFileInfoShow(data, file);
                }

            });

        }
    }

    // Retrieves data for all items within the given folder and
    // creates a list view. Binds contextual menu options.
    // TODO: consider stylesheet switching to switch between grid
    // and list views with sorting options.
    var getFolderInfo = function (path) {
        // Update location for status, upload, & new folder functions.        
        setUploader(path);

        // Display an activity indicator.
        $('#fileinfo').html('<img id="activity" src="images/wait30trans.gif" width="30" height="30" />');

        // Retrieve the data and generate the markup.       

        if (treaArrayList) {

            if (!treaArrayList[path]) {

                treaArrayList[path] = {};
            }

            data = treaArrayList[path];

            getFolderInfoShow(data);
        } else {

            var d = new Date(); // to prevent IE cache issues
            var url = fileConnector + '?path=' + encodeURIComponent(path) + '&mode=getfolder&showThumbs=' + config.options.showThumbs + '&time=' + d.getMilliseconds() + '&useFileTable=' + config.options.useFileTable;
            if ($.urlParam('type')) url += '&type=' + $.urlParam('type');

            $.getJSON(url, function (data) {

                getFolderInfoShow(data);

            });
        }
    };

    function IDGenerator(prefix) {
        this.prefix = prefix;
        this.num = 1;
        this.getID = function () {
            return this.prefix + (this.num++);
        }

    }


    var generator = new IDGenerator('id');

    // Retrieve data (file/folder listing) for jqueryFileTree and pass the data back
    // to the callback function in jqueryFileTree    
    var fileTreeResult = function (data, callback) {
        var result = '';
        // Is there any error or user is unauthorized?
        if (data.Code == '-1') {
            handleError(data.Error);
            return;
        };

        if (data) {
            result += "<ul class=\"jqueryFileTree\" style=\"display: none;\">";
            for (key in data) {
                var cap_classes = "";

                for (cap in capabilities) {
                    if (has_capability(data[key], capabilities[cap])) {
                        cap_classes += " cap_" + capabilities[cap];
                    }
                }
                if (data[key]['File Type'] == 'dir') {
                    result += "<li class=\"directory collapsed\"><a href=\"#\" id = \"" + generator.getID("id") + "\" class=\"" + cap_classes + "\" data-path=\"" + data[key]['Path'] + "\">" + data[key]['Filename'] + "</a></li>";
                } else {
                    if (config.options.listFiles) {
                        result += "<li class=\"file ext_" + data[key]['File Type'].toLowerCase() + "\"><a href=\"#\" id = \"" + generator.getID("id") + "\" class=\"" + cap_classes + "\" data-path=\"" + data[key]['Path'] + "\" user=\"" + data[key]['Properties']['User'] + "\">" + data[key]['Filename'] + "</a></li>";
                    }
                }
            }
            result += "</ul>";
        } else {
            result += '<h1>' + lg.could_not_retrieve_folder + '</h1>';
        }
        callback(result);
    };

    var treaArrayList;

    var CreateTreeList = function (tree) {

        for (key in tree) {
            treaArrayList[key] = tree[key]["PathChild"];

            CreateTreeList(treaArrayList[key]);
        }
    }

    var populateFileTree2 = function (path, callback) {
        var d = new Date(); // to prevent IE cache issues
        var url = fileConnector + '?path=' + encodeURIComponent(path) + '&mode=getfolderList&showThumbs=' + config.options.showThumbs + '&time=' + d.getMilliseconds() + '&update=' + Update + '&useFileTable=' + config.options.useFileTable;
        if ($.urlParam('type')) url += '&type=' + $.urlParam('type');

        if (!treaArrayList) {

            $.get(url, function (val) {

                Update = false;

                var data = eval('(' + val + ')');

                treaArrayList = {};

                dataNew = {};

                dataNewChild = {};

                dataNewChild["PathChild"] = data;

                dataNew[fileRoot] = dataNewChild

                CreateTreeList(dataNew);

                getDetailView(fileRoot);

                //alert("Загрузилось");                

                fileTreeResult(treaArrayList[fileRoot], callback);

            });
        } else {

            if (path) {
                fileTreeResult(treaArrayList[path], callback);
            }
        }
    };

    // Retrieve data (file/folder listing) for jqueryFileTree and pass the data back
    // to the callback function in jqueryFileTree
    var populateFileTree = function (path, callback) {
        var d = new Date(); // to prevent IE cache issues
        var url = fileConnector + '?path=' + encodeURIComponent(path) + '&mode=getfolder&showThumbs=' + config.options.showThumbs + '&time=' + d.getMilliseconds() + '&useFileTable=' + config.options.useFileTable;
        if ($.urlParam('type')) url += '&type=' + $.urlParam('type');
        $.getJSON(url, function (data) {
            var result = '';
            // Is there any error or user is unauthorized?
            if (data.Code == '-1') {
                handleError(data.Error);
                return;
            };

            if (data) {
                result += "<ul class=\"jqueryFileTree\" style=\"display: none;\">";
                for (key in data) {
                    var cap_classes = "";

                    for (cap in capabilities) {
                        if (has_capability(data[key], capabilities[cap])) {
                            cap_classes += " cap_" + capabilities[cap];
                        }
                    }
                    if (data[key]['File Type'] == 'dir') {
                        result += "<li class=\"directory collapsed\"><a href=\"#\" id = \"" + generator.getID("id") + "\" class=\"" + cap_classes + "\" data-path=\"" + data[key]['Path'] + "\">" + data[key]['Filename'] + "</a></li>";
                    } else {
                        if (config.options.listFiles) {
                            result += "<li class=\"file ext_" + data[key]['File Type'].toLowerCase() + "\"><a href=\"#\" id = \"" + generator.getID("id") + "\" class=\"" + cap_classes + "\" data-path=\"" + data[key]['Path'] + "\">" + data[key]['Filename'] + "</a></li>";
                        }
                    }
                }
                result += "</ul>";
            } else {
                result += '<h1>' + lg.could_not_retrieve_folder + '</h1>';
            }
            callback(result);
        });
    };

    /*---------------------------------------------------------
      Initialization
    ---------------------------------------------------------*/

    function parse(str) {
        var args = [].slice.call(arguments, 1),
            i = 0;

        return str.replace(/%s/g, function () {
            return args[i++];
        });
    }


    function get(name) {
        if (name = (new RegExp('[?&]' + encodeURIComponent(name) + '=([^&]*)')).exec(location.search))
            return decodeURIComponent(name[1]);
    }

    function IsDate(value) {

        var regularChislo = /(^(__.____)|^(__.__.____)|^(01.4000)|^(01.01.4000)|^(((0[1-9]|[12]\d|3[01])[.]{1}(0[13578]|1[02])[.]{1}((19\d{2})|([2-3]{1}\d{3})))|((0[1-9]|[12]\d|30)[.]{1}(0[13456789]|1[012])[.]{1}((19\d{2})|([2-3]{1}\d{3})))|((0[1-9]|1\d|2[0-8])[.]{1}02[.]{1}((19\d{2})|([2-3]{1}\d{3})))|(29[.]{1}02[.]{1}((19|[2-3]\d)(0[48]|[2468][048]|[13579][26])|((16|[2468][048]|[3579][26])00)))))(\s0:00:00)?/.exec(value);

        return (regularChislo != null && regularChislo[0] == value);
    }

    Update = false;

    function RecursDialog(data, i,up) {

        var k = 0;
        var inData = {};
        var flag = false;
        for (key in data) {

            if (k == i) {
                inData = data[key];
                flag = true;
            }

            k++;
        }

        if (flag) {

            if (inData["Code"] == -1) {

                var btns = {};
                btns[lg.no] = "false," + inData["File"];
                btns[lg.yes] = "true," + inData["File"];
                $.prompt(parse(lg.FILE_ALREADY_EXISTS, inData["File"]), {
                    buttons: btns,
                    callback: function dialog(answer) {
                        if (answer.split(",")[0] == "false") {

                            for (var p = 0; p < up.files.length; p++) {

                                if (up.files[p].name == answer.split(",")[1]) {
                                    up.removeFile(up.files[p]);
                                }
                            }
                        }

                        i = i + 1;
                        RecursDialog(data, i,up);
                    }
                });

            } else {
                i = i + 1;
                RecursDialog(data, i,up);
            }
        }
    }

    function msieversion() {

        var ua = window.navigator.userAgent;
        var msie = ua.indexOf("MSIE ");

        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) // If Internet Explorer, return version number
            return true;
        else // If another browser, return 0
            return false;
    }

    function Init() {

        /** load searchbox */
        if (config.options.searchBox === true) {
            $.getScript("./scripts/filemanager.liveSearch.js");
        } else {
            $('#search').remove();
        }

        $("#file-input-container").hide();
        $("#upload").hide();
        $("#uploadFlash").show();

        $('#uploadFlash').click(function () {

            getFolderInfo($('#currentpath').val());

            var dialog_buttons = {};

            /*dialog_buttons[lg.download] = function () {

                if ($("#form_validate").valid()) {
                   
                }
            }*/

            dialog_buttons[lg.close] = function () {

                $("#dialog").dialog("close");
            }

            $("#dialog").dialog({
                width: 600,
                height: 470,
                title: lg.dialod_upload,
                modal: true,
                closeOnEscape: true,
                position: 'center',
                buttons: dialog_buttons,
                show: "drop",
                hide: { effect: "drop", direction: "right" },
                close: function () {                  

                    $('#form_validate').validate().resetForm();
                },
                open: function (event, ui) {                  

                        var strExt = "";
                        for (ext in config.security.uploadRestrictions) {

                            strExt += config.security.uploadRestrictions[ext] + ",";
                        }

                        strExt = strExt.substr(0, strExt.length - 2);

                        $("#file_upload").pluploadQueue({
                            // General settings
                            runtimes: 'html5,flash,silverlight,html4',
                            url: '/Filemanager/connectors/ashx/filemanager.ashx?currentpath=' +
                                  encodeURIComponent($('#currentpath').val()) + '&user_id=' + encodeURIComponent($("#user_id").text()) +
                                  '&user_create=' + encodeURIComponent($("#user_create").val()) +
                                  '&date_document=' + encodeURIComponent($("#date_document").val()) +
                                  '&mode=addFlash',
                            //chunk_size: '1mb',
                            rename: true,
                            dragdrop: true,

                            filters: {
                                // Maximum file size
                                max_file_size: '100000mb',
                                // Specify what files to browse for
                                mime_types: [
                                    { title: "All files", extensions: strExt }                                   
                                ]
                            },

                            // Resize images on clientside if we can
                           /* resize: {
                                width: 200,
                                height: 200,
                                quality: 90,
                                crop: true // crop to exact dimensions
                            },*/


                            // Flash settings
                            flash_swf_url: '/Filemanager/plupload/js/Moxie.swf',

                            // Silverlight settings
                            silverlight_xap_url: '/Filemanager/plupload/js/Moxie.xap',
                              
                            preinit: {

                                UploadComplete: function (up, files, result) {

                                    updateFolder();                                  
                                    
                                },
                                FileUploaded: function (upldr, file, result) {

                                    var data = eval('(' + result.response + ')');

                                    if (data['Code'] == -2) {

                                        $.prompt(lg.ERROR_RENAMING_DIRECTORY);

                                        $('#update').trigger("click");
                                    }
                                }
                            },

                            init:
                            {                        
                                FilesAdded: function (up, files) {

                                    var str = "";
                                    for (var i in files) {
                                        str = str + files[i].name + ",";
                                    }

                                    str = str.substr(0, str.length - 1);

                                    var url = '/Filemanager/connectors/ashx/filemanager.ashx?currentpath=' + encodeURIComponent($('#currentpath').val()) + '&user_id=' + $("#user_id").val() + '&mode=rewriteNoFlash'

                                    $.ajax({
                                        type: 'POST',
                                        url: url,
                                        data: { fileNames: str },
                                        async: false,
                                        success: function (result) {

                                            var newData = eval('(' + result + ')');

                                            RecursDialog(newData, 0,up);

                                        }
                                    });
                                }
                            }
                            
                        });                       
                    
                },

                create: function (event, ui) {
                }
            });
        });

        if (config.options.useFileTable) {

            $('#form_validate').validate();

            var str_info = "<table><tr><td>";
            str_info += lg.user + ": </td><td><div id='user_id'>";
            str_info += get("user_id") + "</div></td><tr><td>";
            str_info += lg.user_create_document + ": </td><td><input type='text' id='user_create'/></td></tr><tr><td>";
            str_info += lg.date_document + ": </td><td><input type='text' id='date_document' class='date_document'/><div><label class='error' for='date_document' /></div></td>";
            str_info += "</tr></table>";

            $("#attr_info").html(str_info);
        }

        $.validator.addMethod("date_document", function (value, element) {

            if (IsDate(value) || value == "") {
                return true;
            } else {
                return false;
            }

        }, "Невірний формат дати");

        intitDatepicker("date_document", lg.date_document);


        $("#OpenTree").hide();
        if (config.extras.extra_js) {
            for (var i = 0; i < config.extras.extra_js.length; i++) {
                $.ajax({
                    url: config.extras.extra_js[i],
                    dataType: "script",
                    async: config.extras.extra_js_async
                });
            }
        }
        // Loading CodeMirror if enabled for online edition
        if (config.edit.enabled) {
            loadCSS('./scripts/CodeMirror/lib/codemirror.css');
            loadCSS('./scripts/CodeMirror/theme/' + config.edit.theme + '.css');
            loadJS('./scripts/CodeMirror/lib/codemirror.js');
            loadJS('./scripts/CodeMirror/addon/selection/active-line.js');
            loadJS('./scripts/CodeMirror/dynamic-mode.js');
        }


        

        if (config.options.relPath === false) {
            relPath = window.location.protocol + "//" + window.location.host;
        } else {
            relPath = config.options.relPath;
        }

        if ($.urlParam('exclusiveFolder') != 0) {
            fileRoot += $.urlParam('exclusiveFolder');
            if (fileRoot.charAt(fileRoot.length - 1) != '/') fileRoot += '/'; // add last '/' if needed
            fileRoot = fileRoot.replace(/\/\//g, '\/');
        }

        if ($.urlParam('expandedFolder') != 0) {
            expandedFolder = $.urlParam('expandedFolder');
            fullexpandedFolder = fileRoot + expandedFolder;
        } else {
            expandedFolder = '';
            fullexpandedFolder = null;
        }

        // we finalize the FileManager UI initialization 
        // with localized text if necessary
        if (config.options.autoload == true) {
            $('#upload').append(lg.upload);
            $('#uploadFlash').append(lg.upload);
            $('#newfolder').append(lg.new_folder);
            $('#grid').attr('title', lg.grid_view);
            $('#list').attr('title', lg.list_view);
            $('#fileinfo h1').append(lg.select_from_left);
            $('#itemOptions a[href$="#select"]').append(lg.select);
            $('#itemOptions a[href$="#edit"]').append(lg.editFile);
            $('#itemOptions a[href$="#download"]').append(lg.download);
            $('#itemOptions a[href$="#rename"]').append(lg.rename);
            $('#itemOptions a[href$="#move"]').append(lg.move);
            $('#itemOptions a[href$="#replace"]').append(lg.replace);
            $('#itemOptions a[href$="#delete"]').append(lg.del);
        }

        /** Adding a close button triggering callback function if CKEditorCleanUpFuncNum passed */
        if ($.urlParam('CKEditorCleanUpFuncNum')) {
            $("body").append('<button class="button" id="close-btn" type="button">' + lg.close + '</button>');

            $('#close-btn').click(function () {
                parent.CKEDITOR.tools.callFunction($.urlParam('CKEditorCleanUpFuncNum'));
            });
        }

        /** Input file Replacement */
        $('#browse').append('+');
        $('#browse').attr('title', lg.browse);
        $("#newfile").change(function () {
            $("#filepath").val($(this).val().replace(/.+[\\\/]/, ""));
        });

        // cosmetic tweak for buttons
        $('button').wrapInner('<span></span>');

        // Set initial view state.
        $('#fileinfo').data('view', config.options.defaultViewMode);
        setViewButtonsFor(config.options.defaultViewMode);

        $('#OpenTree').click(function () {

            $("#CloseTree").show();
            $("#OpenTree").hide();

            var currentViewMode = $('#fileinfo').data('view');
            $('#fileinfo').data('view', currentViewMode);

            if (treaArrayList == null) {
                createFileTree();
            } else {

                $('#filetree').find("ul>li.collapsed>a").trigger('openTree');
                getFolderInfo(fileRoot);
            }

        });

        $('#pen').attr("title", lg.search_name);
        $('#people').attr("title", lg.search_people);
        $('#update').attr("title", lg.update);

        $('#OpenTree').attr("title", lg.open_tree);
        $('#CloseTree').attr("title", lg.close_tree);

        $('#pen').click(function () {

            $("#people").show();
            $("#pen").hide();

            panSearch = false;

            $('#q').liveUpdate('#filetree ul', 2).blur();

        });

        $('#people').click(function () {

            $("#people").hide();
            $("#pen").show();

            panSearch = true;

            $('#q').liveUpdate('#filetree ul', 1).blur();

        });

        $('#CloseTree').click(function () {

            $("#CloseTree").hide();
            $("#OpenTree").show();

            var currentViewMode = $('#fileinfo').data('view');
            $('#fileinfo').data('view', currentViewMode);
            $('#filetree>ul>li.expanded>a').trigger('closeTree');
            getFolderInfo(fileRoot);

        });

        $('#update').click(function () {

            if (updateTrue) {

                updateTrue = false;

                treaArrayList = null;
                Update = true;
                createFileTree();
            }

        });

        $('#home').click(function () {
            var currentViewMode = $('#fileinfo').data('view');
            $('#fileinfo').data('view', currentViewMode);
            $('#filetree>ul>li.expanded>a').trigger('closeTree');
            getFolderInfo(fileRoot);
        });

        // Set buttons to switch between grid and list views.
        $('#grid').click(function () {
            setViewButtonsFor('grid');
            $('#fileinfo').data('view', 'grid');
            getFolderInfo($('#currentpath').val());
        });

        $('#list').click(function () {
            setViewButtonsFor('list');
            $('#fileinfo').data('view', 'list');
            getFolderInfo($('#currentpath').val());
        });


        if (!config.options.showButtonMode) {
            $('#client').hide();
            $("#server").hide();
        }


        $('#client').click(function () {

            $("#client").hide();
            $("#server").show();
            config.options.serverMode = true;

            $("#CloseTree").hide();
            $("#OpenTree").hide();


            $('#update').trigger("click");

            $('#home').trigger("click");


        });

        $('#server').click(function () {

            $("#server").hide();
            $("#client").show();

            config.options.serverMode = false;

            $("#CloseTree").show();
            $("#OpenTree").hide();

            $('#update').trigger("click");
        });
        // Provide initial values for upload form, status, etc.
        setUploader(fileRoot);

        // Creates file tree.
        createFileTree("All");

        // Disable select function if no window.opener
        if (!(window.opener || window.tinyMCEPopup || $.urlParam('field_name'))) $('#itemOptions a[href$="#select"]').remove();
        // Keep only browseOnly features if needed
        if (config.options.browseOnly == true) {
            $('#file-input-container').remove();
            $('#upload').remove();
            $('#newfolder').remove();
            $('#toolbar').remove('#rename');
            $('.contextMenu .edit').remove();
            $('.contextMenu .rename').remove();
            $('.contextMenu .move').remove();
            $('.contextMenu .replace').remove();
            $('.contextMenu .delete').remove();
        }

        // Adjust layout.
        setDimensions();
        $(window).resize(setDimensions);

        // Provides support for adjustible columns.
        $('#splitter').splitter({
            sizeLeft: 200,

            doSplitMouse: function (newPos) {

                var contentBox = $("#fileinfo");

                var width = parseInt(contentBox.css("width").replace("px", "")) - 50;
                var height = parseInt(contentBox.css("height").replace("px", "")) - 50;

                var iframe = contentBox.find("iframe");
                if (iframe.length > 0) {
                    iframe.css("width", width);
                    iframe.css("height", height);
                }

            }
        });

        if (config.options.serverMode) {
            $("#CloseTree").hide();
            $('#home').trigger("click");
        }

        if (config.options.useFileTable) {
            $("#pen").show();
        }
    }

    $(function () {

        if (get("fileRoot") != undefined) {
            config.options.fileRoot = get("fileRoot");
        }

        if (get("serverRoot") != undefined) {
            config.options.serverRoot = eval(get("serverRoot"));
        }

        if (get("serverMode") != undefined) {
            config.options.serverMode = eval(get("serverMode"));
        }

        if (get("useFileTable") != undefined) {
            config.options.useFileTable = eval(get("useFileTable"));
        }

        if (!config.options.serverRoot) {

            fileRoot = config.options.fileRoot;

            Init();

        } else {

            var url = "connectors/ashx/filemanager.ashx?path=" + encodeURIComponent(config.options.fileRoot) + "&mode=getRootPath";

            $.get(url, function (path) {

                fileRoot = path;
                Init();

            });
        }

    });

    // add useragent string to html element for IE 10/11 detection
    var doc = document.documentElement;
    doc.setAttribute('data-useragent', navigator.userAgent);

})(jQuery);


