export async function main(argv){
    let files = argv.slice(1);
    let exit = 0;
    if(!files.length) files = ["-"]
	for (let file of files) {
		try {
            if(file == "-") // copy stdin to fd 100
                api.fd.dup(0, 100);
    	    else
                await api.fs.open(file, 'r', 100);
			// const size = (await api.fs.stat(file)).size;
            while(true){
			    let buffer = await api.fd.read(100, 4096);
                if(buffer.length == 0) break;
			    await api.fd.write(1, buffer);
            }
			await api.fd.close(100);
		} catch(err) {
			await api.fd.write(1, 'cat: ' + err.toString()+"\n");
			exit = 1;
		}
    }
		await api.fd.write(1, "\n") // tsh is sus
    close(exit)
}