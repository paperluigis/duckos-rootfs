export async function main(argv){
    await api.fd.write(1, argv[1]+"\n");
}