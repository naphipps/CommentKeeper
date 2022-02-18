//##===----------------------------------------------------------------------===##//
//
//  Author: Nathan Phipps 12/7/20
//
//##===----------------------------------------------------------------------===##//

var app = new function () {
    var open_folders = new Map();
    var comment_record = new Map(); //TODO seems like it doesn't want to be viewable by client vs server??
    var file_delim = window.process.platform() === "win32" ? "\\" : "/";
    
    function byId(id) {
        return document.getElementById(id);
    }
    
    function empty(element) {
        while (element.firstChild) element.removeChild(element.firstChild);
        element.innerText = "";
    }

    function createElement(type) {
        return document.createElement(type);
    }

    function fire(event_type, element, detail) {
        element.dispatchEvent(new CustomEvent(event_type, { detail: detail }));
    }

    function isObject(o) {
        return Object.prototype.toString.call(o) === "[object Object]";
    }

    function rememberFolder(folder) {
        var folders = [];
        var stored_folders = window.localStorage.getItem("open_folders");
        if (stored_folders !== null) folders = stored_folders.split(":");

        var index = folders.indexOf(folder);
        if (index === -1) folders.push(folder);
        
        window.localStorage.setItem("open_folders", folders.join(":"));
    }

    function forgetFolder(folder) {
        var folders = [];
        var stored_folders = window.localStorage.getItem("open_folders");
        if (stored_folders !== null) folders = stored_folders.split(":");

        var index = folders.indexOf(folder);
        if (index !== -1) folders.splice(index, 1);

        if (folders.length > 0) {
            window.localStorage.setItem("open_folders", folders.join(":"));
        }
        else {
            window.localStorage.removeItem("open_folders");
        }
    }
    
    function createFolderObject(folder) {
        var folder_object = null;
        if (!open_folders.has(folder)) {
            rememberFolder(folder);

            var container = createElement("div");
            container.id = "container_" + folder;
            container.classList.add("folder_container");
            
            var bar = createElement("div");
            bar.id = "bar_" + folder;
            bar.classList.add("folder_bar");
            bar.classList.add("caret");
            bar.innerText = folder;
            bar.addEventListener("click", function () {
                this.parentElement.querySelector(".nested").classList.toggle("active");
                this.classList.toggle("caret-down");
            });
            
            var close_button = createElement("button");
            close_button.style.padding = "2px";
            close_button.style.width = "20px";
            close_button.style.height = "20px";
            close_button.style.marginLeft = "5px";
            close_button.setAttribute("type", "button");
            close_button.addEventListener("click", function(event){
                event.stopPropagation();
                forgetFolder(folder);
                open_folders.delete(folder);
                comment_record.delete(folder);
                container.remove();
            });
            close_button.innerText = "X";
            bar.appendChild(close_button);
            
            var results = createElement("div");
            results.id = "results_" + folder;
            results.classList.add("folder_results");
            results.classList.add("nested");
            
            container.appendChild(bar);
            container.appendChild(results);
            
            folder_object = {element: container, folder: folder, results_element: results};
            open_folders.set(folder, folder_object);
        }
        return folder_object;
    }

    function init() {
        byId("patterns").value = "TODO:";
        
        var element = byId("add_folder_button");
        element.addEventListener("click", openFolderSend);
        window.ipc.receive("openFolderReceive", openFolderReceive);
        window.ipc.receive("grepFolderReceive", grepFolderReceive);

        var stored_folders = window.localStorage.getItem("open_folders");
        if (stored_folders !== null) openFolderReceive(stored_folders.split(":"));
        
        setInterval(refresh, 1000 * 5);
    }

    function openFolderSend() {
        window.ipc.send("openFolderSend");
    }

    function openFolderReceive(folders) {
        if (folders && folders.length > 0) {
            var root  = byId("root");
            for (var i = 0; i < folders.length; i++) {
                var folder_object = createFolderObject(folders[i]);
                if (folder_object) {
                    root.appendChild(folder_object.element);
                }
            }
            refresh();
        }
    }
    
    function grepFolderSend(folder) {
        var patterns = byId("patterns").value.split(",");
        
        for (var i=0; i<patterns.length; i++)
            window.ipc.send("grepFolderSend", {pattern: patterns[i], folder: folder});
    }
    
    function grepFolderReceive(results) {
        refreshFolderResults(results);
    }
    
    //-------------------------------------------------------------------------

    function processLine(line, projectFolder) {

        var colon_index = -1;
        if (window.process.platform() === "win32") {
            colon_index = line.indexOf(":", 2); //skip the "C:" colon
        }
        else {
            colon_index = line.indexOf(":");
        }

        var path = line.substr(0, colon_index).substr(projectFolder.length + 1);
        var path_array = path_array = path.split(file_delim);

        var line_num_index = line.indexOf(":", colon_index + 1);
        var line_num = line.substr(
            colon_index + 1,
            line_num_index - (colon_index + 1)
        );
        var comment = line.substr(line_num_index + 1).trim();

        var processed_line = {
            line: line,
            folder: projectFolder,
            path: path,
            path_array: path_array,
            line_num: line_num,
            comment: comment,
        };

        return processed_line;
    }

    function addToTree(line, projectFolder) {
        var record = processLine(line, projectFolder);
        var comments = comment_record.has(projectFolder) ? comment_record.get(projectFolder) : {};
        comments[line] = record;
        comment_record.set(projectFolder, comments);
        
        if (!byId("results_ul_" + projectFolder)) {
            var ul = createElement("ul");
            ul.id = "results_ul_" + projectFolder;
            byId("results_" + projectFolder).appendChild(ul);
        }
        
        if (byId(record.line)) return;

        //build li for comment
        record.li = createElement("li");
        var line_num_div = createElement("div");
        var comment_code = createElement("code");

        record.li.id = line;
        record.li.classList.add("has-comment");
        record.li.setAttribute("line-num", record.line_num);
        line_num_div.classList.add("line-num");
        line_num_div.innerText = record.line_num;
        comment_code.innerText = record.comment;

        record.li.appendChild(line_num_div);
        record.li.appendChild(comment_code);

        function sortedInsert(ul, li, use_line_num = false) {
            var lis = ul.children;
            var successful_insert = false;

            for (var i = 0; i < lis.length; i++) {
                if (lis[i].tagName !== "LI") continue;

                if (use_line_num) {
                    var li_num = Number(li.getAttribute("line-num"));
                    var lis_num = Number(lis[i].getAttribute("line-num"));

                    if (li_num < lis_num) {
                        lis[i].insertAdjacentElement("beforebegin", li);
                        successful_insert = true;
                        break;
                    }
                } 
                else if (li.id < lis[i].id) {
                    lis[i].insertAdjacentElement("beforebegin", li);
                    successful_insert = true;
                    break;
                }
            }

            if (!successful_insert) ul.appendChild(li);
        }

        function createId(prefix, record, index) {
            var id = prefix + record.folder;
            for (var j=0; j<=index; j++) id += file_delim + record.path_array[j];
            return id;
        }

        for (var i = 0; i < record.path_array.length; i++) {
            var li_id = createId("li_", record, i);
            var ul_id = createId("ul_", record, i);
            
            if (byId(li_id)) continue;

            var li = createElement("li");
            var div = createElement("div");
            var ul = createElement("ul");

            li.id = li_id;
            ul.id = ul_id;
            ul.classList.add("nested");
            div.innerText = record.path_array[i];
            div.classList.add("caret");
            div.addEventListener("click", function () {
                this.parentElement.querySelector(".nested").classList.toggle("active");
                this.classList.toggle("caret-down");
            });

            li.appendChild(div);
            li.appendChild(ul);

            if (i === 0) {
                sortedInsert(byId("results_ul_" + projectFolder), li);
            } 
            else {
                sortedInsert(byId(createId("ul_", record, i - 1)), li);
            }
        }

        sortedInsert(byId(createId("ul_", record, record.path_array.length - 1)), record.li, true);
    }

    function removeFromTree(line, projectFolder) {
        var comments = comment_record.get(projectFolder);
        var record = comments[line];
        delete comments[line];
        comment_record.set(projectFolder, comments);

        var element = byId(line);
        var parent = element.parentNode;
        var continue_prune = true;

        do {
            if (element.id === "results_ul_" + projectFolder) {
                break;
            }
            
            element.remove();

            element = parent;
            parent = parent.parentNode;

            if (element.tagName === "LI") {
                continue_prune = element.getElementsByTagName("UL").length === 0;
            } 
            else if (element.tagName === "UL") {
                continue_prune = element.getElementsByTagName("LI").length === 0;
            } 
            else {
                continue_prune = false;
            }
        } while (continue_prune);
    }
    
    function refreshFolderResults(grep_results) {
        var folder = grep_results.folder;
        var pattern = grep_results.pattern;
        var grep = grep_results.grep;
        var container_element = byId("container_" + folder);
        var results_element = byId("results_" + folder);
        
        if (results_element.innerText === "Invalid Folder!" ||
            results_element.innerText === "No Comments Found") {
            empty(results_element);
        }
        
        var comments = comment_record.has(folder) ? comment_record.get(folder) : {};
        
        var lines_to_remove = [];
        var lines_to_add = [];
        
        if (grep) {
            lines_to_add = grep.split("\n");
            while (lines_to_add[lines_to_add.length - 1] == "") lines_to_add.pop();
        }
        
        //filter through lines to add and collect lines to remove
        for (var line in comments) {
            if (lines_to_add.includes(line)) {
                var index = lines_to_add.indexOf(line);
                lines_to_add.splice(index, 1);
            } 
            else {
                lines_to_remove.push(line);
            }
        }
        
        for (var i = 0; i < lines_to_add.length; i++) {
            addToTree(lines_to_add[i], folder);
        }
        
        for (var i = 0; i < lines_to_remove.length; i++) {
            removeFromTree(lines_to_remove[i], folder);
        }
        
        if (byId("results_ul_" + folder) && byId("results_ul_" + folder).children.length === 0) {
            empty(byId("results_" + folder));
            byId("results_" + folder).innerText = "No Comments Found";
        }
        
        comment_record.set(folder, comments);
    }

    function refreshFolder(folder_object) { //TODO: refactor to refreshProject(project)
        var folder_is_valid = folder_object.folder !== "" && window.fs.existsSync(folder_object.folder);
        
        if (folder_is_valid) {
            grepFolderSend(folder_object.folder);
        }
        else {
            empty(folder_object.results_element);
            folder_object.results_element.innerText = "Invalid Folder!";
        }
    }

    function refresh() {
        for (const [key, value] of open_folders) refreshFolder(value);
    }

    return { init: init };
};

app.init();
