/*Roadmap****************************\
| [X] Readline
| [X] Command parsing  (done, but can fail silently)
| [ ] Variables
| [ ] Functions
| [ ] .rc file
| [ ] stdio redirection
| [ ] Job control
\************************************/
/*
var escapechar = "\\";
var lineseps = ['"', "'"];

function stringParser(str) {
    var sstr = str.split(escapechar);
    for (var i = 0; i < sstr.length; i++) {
        if (sstr[i].startsWith("u")) {
            sstr[i] = String.fromCharCode(parseInt(sstr[i].slice(1, 5), 16)) + sstr[i].slice(5);
        } else if (sstr[i].startsWith("x")) {
            sstr[i] = String.fromCharCode(parseInt(sstr[i].slice(1, 2), 16)) + sstr[i].slice(3);
        } else if (sstr[i].startsWith("n")) {
            sstr[i] = "\n" + sstr[i].slice(1);
        } else if (sstr[i].startsWith("b")) {
            sstr[i] = "\b" + sstr[i].slice(1);
        } else if (sstr[i].startsWith("t")) {
            sstr[i] = "\t" + sstr[i].slice(1);
        }
    }
    return sstr.join("");
}

function cmdParser(argv) {
    var susv = argv.split(" ");
    var dukv = [];
    var findsus = null;
    var at = -1;

    for (var i = 0; i < susv.length; i++) {
        dukv.push(susv[i]);
        for (var j = 0; j < lineseps.length; j++) {
            if (susv[i] === lineseps[j].repeat(2)) dukv[i] = "";
            else if (!susv[i].startsWith(escapechar + lineseps[j]) && susv[i].startsWith(lineseps[j])) at = i, findsus = lineseps[j];
        }

        if (findsus !== null && i !== at) {
            dukv[at].push(susv[i]);
            if (!susv[i].endsWith(escapechar + findsus) && susv[i].endsWith(findsus)) at = -1, findsus = null;
            else if (i === susv.length - 1) throw new Error("can't find `" + findsus + "`");
            dukv[i] = undefined;
        } else if (i === at) dukv[at] = [susv[i]];
    }

    for (var k = 0; k < dukv.length; k++) if (Array.isArray(dukv[k])) dukv[k] = stringParser(dukv[k].join(" ").slice(1, -1));
    return dukv.filter(function (duck) { return duck !== undefined; });
}
*/ // duck's sus parser
//sus question:
//how processes are supposed to access FS
// through system calls that are unimplemented
// idk we can implement them now lol

// oh btw
// you can pass env variables to emscripten apps
const builtins = {
    async help(){
        await api.fd.write(1, `
echo   - prints arguments separated by spaces
pwd    - prints current working directory
cd     - changes into current working directory
clear  - clears the screen
`.slice(1));
    },
    async ls(args){
        if(!args.length) args.push(".");
        for(let arg of args) {
            try {
                let q = await api.fs.readdir(arg);
                await api.fd.write(1, `${args.length>1?(arg+":\n"):""}${q.join("\n")}\n`)
            } catch(e) {
                await api.fd.write(1, `ls: ${arg}: ${e.message}\n`);
            }
        }
    },
    async echo(args){
        await api.fd.write(1, args.join(" ")+"\n");
    },
    async pwd(args){
        await api.fd.write(1, await do_syscall("fs_getwd")+"\n");
    },
    async cd(args){
        if(!args[0]) return await api.fd.write(1, `cd: no path provided\n`)
        try {
            await do_syscall("fs_chwd", args[0])
        } catch(e) {
            await api.fd.write(1, `cd: ${args[0]}: ${e.message}\n`);
        }
    },
    async clear(args){
        await api.fd.write(1, `\x1b[2J\x1b[H`);
    },
    async exit(){
        if(await api.proc.getpid) close()
        else api.fd.write(1, `exit: will not exit because i'm init`)
    }
}

const aliases = {
    "cls": "clear" // nt_cat
};

async function which(cmd){
    if(cmd[0] == "." || cmd[0] == "/") return cmd; // handle paths
    let PATH = (await api.environ.get("PATH")).split(":");
    for(let q of PATH){
        try {
            for(let b of await api.fs.readdir(q)){
                if(b.includes(cmd+".js")) return q+"/"+b;
            }
        } catch(e) { console.error(e) } // we don't care if folder doesn't exist, tho logging would be useful
    }
    return null;
}

async function run(path, args){
    let pid = await api.proc.proc(path, args, {});
    return await api.proc.wait(pid);
}

export async function main(argv) {
    while(true){
        let q = await readline("\x1b[32;1msus-sh\x1b[0m$ ", 8);
        if(!q.trim()) continue;
        q = [...q.matchAll(/((?:[^\t "'$]|"(?:[^\\"]|\\.)+?"|'[^']+?')+)(?:[\t ]|$|\\\n)+/gs)].map(e=>{if(e[1][0]=='"'||e[1][0]=="'")e=e[1].slice(1,-1);else e=e[1];return e.replace(/'(.+?)'|\\(.)/g,"$1$2").replace(/"((?:[^\\"]|\\.)+?)"/g,"$1")})
        if(q[0][0]!="/"){
            q[0] = aliases[q[0]] || q[0]
        }else{
            q[0]=q[0].slice(1)
        }
        let duckpath;
        if(builtins[q[0]]) await builtins[q[0]](q.slice(1))
        else if(duckpath=await which(q[0])) await run(duckpath, q);
        else await api.fd.write(1, `${argv[0]}: command not found: ${q[0]}\n`)
    }
}

let readline_history = [""];
async function readline(ps, psl){
    function parse_ansi(string){
        let line = "";
        let args = [];
        let numbers = "0123456789";
        for(let i=0;i<string.length;i++){
            if(numbers.includes(string[i])){
                line += string[i]
            } else if (string[i] == ";") {
                args.push(parseInt(line))
                line="";
            } else {
                args.push(parseInt(line))
                return {
                    type: string[i],
                    args, ended_on: i+1
                }
            }
        }
    }
    let b = new TextDecoder();
    let line = "";
    let cursorPos = 0;
    let x = readline_history.length;
    while(true){
        await api.fd.write(1, `\r\x1b[K${ps}${line.slice(0,cursorPos)}\x1b[s${line.slice(cursorPos)}\x1b[u`);
        let e = b.decode(await api.fd.read(0, 1));
        for(let i=0;i<e.length;){
            switch(e[i]){
                case "\x0d":
                    //if(l[x-1]!=line) l.push(line);
                    await api.fd.write(1, "\n");
                    // readline_history=readline_history.filter(readline_history=>readline_history.length);
                    // if(readline_history.length > 200) {
                    //     readline_history = readline_history.slice(-180);
                    // }
                    return line;
                    break;
                case "\x7f": // Backspace
                    i++
                    if(!cursorPos) break;
                    line = line.slice(0, cursorPos-1) + line.slice(cursorPos);
                    cursorPos--;
                    break;
                case "\x08": // Ctrl+BackSpace
                    i++
                    if(!cursorPos) break;
                    let q = line.lastIndexOf(" ", cursorPos)-1;
                    if(!q) q = 0;
                    let offset = cursorPos - q;
                    line = line.slice(0, cursorPos - offset) + line.slice(cursorPos);
                    cursorPos -= offset;
                    break;
                case "\x1b": 
                    i++
                    if(e[i] == "[") {
                        i++
                        let q = parse_ansi(e.slice(i));
                        i += q.ended_on;
                        if(q.args[0] == 1 && q.args[1] == 5) { // ctrl
                            switch(q.type){
                                case "C": // <-
                                    cursorPos = line.indexOf(" ", cursorPos+1);
                                    if(cursorPos == -1) cursorPos = line.length;
                                    break;
                                case "D": // ->
                                    cursorPos = line.lastIndexOf(" ", cursorPos-1);
                                    if(cursorPos == -1) cursorPos = 0;
                                    break;
                                case "H": cursorPos = 0; break; // Home
                                case "F": cursorPos = line.length; break; // End
                                break;
                            }
                        } else if(q.type == "~" && q.args[0] == 3 && q.args[1] == 5) { // Ctrl+Delete
                            let q=line.indexOf(" ",cursorPos+1);
                            if(q==-1)q=line.length;
                            line = line.slice(0,cursorPos) + line.slice(q);
                        } else {
                            switch(q.type){
                                // case "A": x = do_syscall("open", "/sus.txt", "r")Math.min(x + 1, readline_history.length - 1); line=readline_history[x]; cursorPos = line.length; break;
                                // case "A": case "B": cursorPos = line.length; break;
                                case "C": cursorPos = Math.min(cursorPos + 1, line.length); break; // <-
                                case "D": cursorPos = Math.max(cursorPos - 1, 0); break; // ->
                                case "H": cursorPos = 0; break; // Home
                                case "F": cursorPos = line.length; break; // End
                                case "~": 
                                    if(q.args[0] == 3) { // Delete
                                        line = line.slice(0, cursorPos) + line.slice(cursorPos+1);
                                    }        
                                break;
                            }
                        }
                    }
                    break;
                default:
                    line = line.slice(0,cursorPos)+e[i]+line.slice(cursorPos);
                    i++
                    cursorPos++
            }
        }
    }
}