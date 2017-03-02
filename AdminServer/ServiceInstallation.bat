nssm remove Doorman
nssm install Doorman "C:/Programmer/nodejs/node.exe"
nssm set service_name AppDirectory "D:/FablabAdmin/AdminServer"
nssm set service_name AppParameters "bin/www"
nssm set service_name AppStdout "D:/FablabAdmin/AdminServer/logs/out.log"
nssm set service_name AppStderr "D:/FablabAdmin/AdminServer/logs/err.log"
nssm start Doorman
