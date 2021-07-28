//console.log("hello world from app.js"); //require ; when not in main
// const {ipcRenderer} = require('electron')

(function main()
{    
    init()

    function init()
    {
        {
            var e = document.getElementById('project-folder-browse-div')
            e.onclick = browseButtonOnClick
            e = document.getElementById('project-folder-refresh')
            e.onclick = refresh   
        }
        
        refresh()

        setInterval(() => {refresh()}, 1000 * 5)
    }

    function browseButtonOnClick()
    {
        //open choose folder dialog
        var result = ipcRenderer.sendSync('open-folder-dialog')

        var projectFolderInput = document.getElementById('project-folder-input')
        projectFolderInput.value = result
        
        refresh()
    }
    
    function show_comment_no_comments_note()
    {
        document.getElementById('comment-tree-no-comments-note').style.display = 'block'
    }
    
    function show_comment_tree_div()
    {
        document.getElementById('comment-tree-div').style.display = 'block'
        document.getElementById('comment-tree-no-comments-note').style.display = 'none'
    }
    
    function hide_comment_tree_div()
    {
        document.getElementById('comment-tree-div').style.display = 'none'
        document.getElementById('comment-tree-no-comments-note').style.display = 'none'
    }
    
    function show_invalid_poject_note()
    {
        document.getElementById('invalid-project-folder-note').style.display = 'block'
    }
    
    function hide_invalid_poject_note()
    {
        document.getElementById('invalid-project-folder-note').style.display = 'none'
    }
    
    function isObject(o)
    {
        return Object.prototype.toString.call(o) === '[object Object]'
    }
    
    //-------------------------------------------------------------------------
    
    function processLine(line, projectFolder)
    {
        var colon_index = line.indexOf(':')
        var path = line.substr(0, colon_index).substr(projectFolder.length+1)
        var path_array = path.split("/")
        
        var line_num_index = line.indexOf(':', colon_index + 1)
        var line_num = line.substr(colon_index + 1, line_num_index - (colon_index + 1))
        var comment = line.substr(line_num_index + 1).trim()
        
        
        return {
            line: line,
            path: path,
            path_array: path_array,
            line_num: line_num,
            comment: comment
        }
    }
        
    function addToTree(line)
    {   
        //projectFolder is assumed to be valid since we check before we get here
        var projectFolder = document.getElementById('project-folder-input').value
        var record = processLine(line, projectFolder)
        comment_record[line] = record
        
        //build li for comment
        record.li = document.createElement('li')
        var line_num_div = document.createElement('div')
        var comment_code = document.createElement('code')
        
        record.li.id = line
        record.li.setAttribute('line-num', record.line_num)
        line_num_div.classList.add('line-num')
        line_num_div.innerText = record.line_num
        comment_code.innerText = record.comment
        
        record.li.appendChild(line_num_div)
        record.li.appendChild(comment_code)
        
        function sortedInsert(ul, li, use_line_num=false)
        {
            var lis = ul.children
            
            var successful_insert = false
            
            for (var i=0; i<lis.length; i++)
            {
                if (lis[i].tagName !== 'LI')
                {
                    continue
                }
                
                if (use_line_num)
                {
                    var li_num = Number(li.getAttribute('line-num'))
                    var lis_num = Number(lis[i].getAttribute('line-num'))
                    
                    if (li_num < lis_num)
                    {
                        lis[i].insertAdjacentElement('beforebegin', li)
                        successful_insert = true
                        break
                    }
                }
                else if (li.id < lis[i].id)
                {
                    lis[i].insertAdjacentElement('beforebegin', li)
                    successful_insert = true
                    break
                }
            }
            
            if (!successful_insert)
            {
                ul.appendChild(li)
            }
        }
        
        function createId(path_array, index) 
        {
            var id = []
            for (var i=index; i>=0; i--)
            {
                id.push(path_array[i])
            }
            
            return id.join("-")
        }
        
        for (var i=0; i<record.path_array.length; i++)
        {
            var path_id = createId(record.path_array, i);
            
            if (document.getElementById(path_id))
            {
                continue
            }
            
            var li = document.createElement('li')
            var div = document.createElement('div')
            var ul = document.createElement('ul')
            
            li.id = path_id + '-li'
            ul.id = path_id
            ul.classList.add('nested')
            div.innerText = record.path_array[i]
            div.classList.add('caret')
            div.addEventListener("click", function() 
            {
                this.parentElement.querySelector(".nested").classList.toggle("active");
                this.classList.toggle("caret-down");
            });
            
            li.appendChild(div)
            li.appendChild(ul)
            
            if (i === 0)
            {
                sortedInsert(document.getElementById('comment-tree-ul'), li)
            }
            else
            {
                sortedInsert(document.getElementById(createId(record.path_array, i-1)), li)
            }
        }
        
        sortedInsert(document.getElementById(createId(record.path_array, record.path_array.length-1)), record.li, true)
    }
    
    function removeFromTree(line)
    {
        var record = comment_record[line]
        delete comment_record[line]
        
        var element = document.getElementById(line)
        var parent = element.parentNode
        var continue_prune = true
        
        do
        {
            if (element.id === 'comment-tree-ul')
            {
                break
            }
            
            element.remove()
            
            element = parent
            parent = parent.parentNode
            
            if (element.tagName === 'LI')
            {
                continue_prune = element.getElementsByTagName('UL').length === 0
            }
            else if (element.tagName === 'UL')
            {
                continue_prune = element.getElementsByTagName('LI').length === 0
            }
            else
            {
                continue_prune = false
            }
        }
        while(continue_prune)
    }
    
    var comment_record = {}
    var is_refreshing = false

    function refresh()
    {
        if (is_refreshing)
        {
            return
        }
        is_refreshing = true
        
        var projectFolder = document.getElementById('project-folder-input').value
        var projectFolderValid = true

        if (projectFolder == '')
        {
            projectFolderValid = false
        }

        if (projectFolderValid && !fs.existsSync(projectFolder))
        {
            projectFolderValid = false
        }

        if (projectFolderValid)
        {
            show_comment_tree_div();
            hide_invalid_poject_note();
            
            var arg = 
            {
                pattern: '//TODO:',
                folder: projectFolder
            }
            var grepResult = ipcRenderer.sendSync('grep-project-folder', arg)
            var lines_to_add = []
                       
            if (grepResult)
            {             
                var stringGrepResult = new TextDecoder('utf-8').decode(grepResult)
                lines_to_add = stringGrepResult.split('\n')
                lines_to_add.pop() //last item is empty
            }
            
            var lines_to_remove = []
            
            //filter through lines to add and collect lines to remove
            for (var line in comment_record)
            {
                if (lines_to_add.includes(line))
                {
                    var index = lines_to_add.indexOf(line)
                    lines_to_add.splice(index, 1)
                }
                else
                {
                    lines_to_remove.push(line)
                }
            }
                       
            //add all lines to add
            for (var i=0; i<lines_to_add.length; i++)
            {
                addToTree(lines_to_add[i])
            }
            
            //remove all lines to remove with pruning step
            for (var i=0; i<lines_to_remove.length; i++)
            {
                removeFromTree(lines_to_remove[i])
            }
            
            if (document.getElementById('comment-tree-ul').children.length === 0)
            {
                hide_comment_tree_div();
                show_comment_no_comments_note();
            }
        }
        else
        {
            hide_comment_tree_div();
            show_invalid_poject_note();
        }
        
        is_refreshing = false
    }

})()