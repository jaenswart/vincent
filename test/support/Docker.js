'use strict';

var child_process = require('child_process');

class Docker {
    startDocker(image) {
        //image should be vincentsshpasswd or vincentsshkeys
        return new Promise(resolve=>{
            child_process.exec(`sudo docker run -d --name vincenttest ${image}`, (error, stdout, stderr)=> {
                    child_process.exec(`sudo docker inspect vincenttest | grep IPAddress | cut -d '"' -f 4`, (error, stdout, stderr)=> {
                        resolve(stdout.substring(0,stdout.length-1));
                    });
                });
        });
    }

    stopDocker(){
       return new Promise(resolve=>{
           console.log("stopping container");
           child_process.exec(`sudo docker stop vincenttest`,
               (error, stdout, stderr)=> {
                   console.log("deleting container");
                   child_process.exec(`sudo docker rm vincenttest`, (error, stdout, stderr)=> {
                       console.log(stdout);
                       resolve();
                   });
               });
       });
    }
}

//var docker = new Docker();
//docker.startDocker().then(docker.stopDocker()).then(console.log("done"));
//docker.startDocker().then(docker.stopDocker);

export default Docker;