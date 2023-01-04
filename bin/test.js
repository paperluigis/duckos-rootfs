export async function main(argv){
    await api.fd.write(1, `Amogus\nSUS=${await api.environ.get("SUS")}\nOpening a sus window!\n`);
    let [winid, canvas] = await api.window.open("canvas", {
        title: "SUS",
        width: 400,
        height: 300
    });
    let con = canvas.getContext("2d");
    con.fillStyle = "#f00";
    con.fillRect(100,50,200,250);
    con.fillStyle = "#07f";
    con.fillRect(225,100,100,50);
    for(let i;;){ //event loop vents
         i = await api.window.nextevent(winid);
         console.log(i.type, i)
         if(i.type == "close") { api.window.close(winid, true); break }
    }
    await new Promise(e => api.events.registerEvent(winid, "close", e, true)); // fuck the event loop im going with async iterators
		//for (const )
    await api.window.close(winid, true);
}