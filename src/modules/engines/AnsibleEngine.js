/**
 * Created by mark on 2016/02/21.
 */

import Engine from '../base/Engine';
import fs from 'fs';
import yaml from 'js-yaml';
import Host from '../host/Host.js';
import logger from '../../Logger';
import child_process from 'child_process';
import Manager from '../base/Manager';
import HostManager from '../host/HostManager';

require("babel-polyfill");

class AnsibleEngine extends Engine {

    constructor(provider) {
        super();
        this.inventory = [];
        this.playbooks = {};//a  directory lookup cache for generated playbooks
        this.provider = provider;
        this.playbookDir = provider.config.get('confdir') + "/playbooks";
        this.errors = [];
    }

    generate(hosts) {
        if (Array.isArray(hosts)) {
            hosts.forEach((host)=> {
                if (host instanceof Host) {
                    this.loadEngineDefinition(host);
                }
            });
        }
    }

    clean() {
        return new Promise((resolve)=> {
            fs.stat(this.playbookDir, (err)=> {
                if (!err) {
                    fs.readdir(this.playbookDir, (err, files)=> {
                        if (err) {
                            logger.logAndThrow("Error attempting to list playbook directory");
                        } else {
                            resolve(files);
                        }
                    });
                } else {
                    reject("no files to delte");
                }
            });
        }).then(files=> {
            files.forEach(file=> {
                let fullpath = path.resolve(this.playbookDir, file);
                fs.unlink(fullpath);
            })
        }, result=> {
            logger.info(result);
        });
    }

    export(host) {
        return new Promise((resolve, reject)=> {
            this.mkPlayBookDir()
                .then((resultObject)=> {
                    if (host instanceof Host) {
                        resultObject.host = host;
                        return this.writePlaybooks(resultObject);
                    } else if (!host) {
                        return this.writePlaybooks(resultObject);
                    } else {
                        throw new Error("Parameter must be of type Host or undefined");
                    }
                })
                .then(this.writeInventory)
                .then(resolve, reject)
                .catch((e)=> {
                    console.log(e)
                });
        });
    }

    mkPlayBookDir() {
        let self = this;
        return new Promise((resolve)=> {
            fs.stat(this.playbookDir, (err)=> {
                if (err) {
                    fs.mkdir(this.playbookDir, (err) => {
                        if (err) {
                            logger.logAndThrow("Error attempting to create playbook directory");
                        } else {
                            resolve({
                                msg: "Created playbooks directory.",
                                self: self
                            });
                        }
                    });
                } else {
                    resolve({
                        msg: "Playbooks directory found.",
                        self: self
                    });
                }
            });
        });
    }

    /*
     writePlaybooks takes a single object parameter with the following properties
     {
     host:<Host Object ,
     self: <AnsibleEngine Object>
     }
     If hosts is undefined then all hosts with playbooks have their playbooks generated else just the required host has
     its playbook generated.
     */
    writePlaybooks(resultObj) {
        try {
            if (resultObj.host) {
                return resultObj.self.writePlaybook({
                    playbook: resultObj.host.name,
                    self: resultObj.self
                });
            }
            //else
            let promises = [];
            for (let playbookTitle in resultObj.self.playbooks) {
                promises.push(resultObj.self.writePlaybook({
                    playbook: playbookTitle,
                    self: resultObj.self
                }));
            }
            return Promise.all(promises).then(()=> {
                return resultObj;
            });
        } catch (e) {
            console.log(e.message);
        }
    }

    /*
     Write out the yml playbook file using javascript ansible object
     */
    writePlaybook(resultObj) {
        return new Promise((resolve, reject)=> {
            try {
                fs.writeFile(resultObj.self.playbookDir + `/${resultObj.playbook}.yml`,
                    resultObj.self.playbooks[resultObj.playbook].yml,
                    (err)=> {
                        if (err) {
                            logger.logAndAddToErrors(`Error attempting to create playbook for ${resultObj.playbook}`,
                                resultObj.self.errors);
                            reject(err);
                        } else {
                            resolve({self: resultObj.self});
                        }
                    });
            } catch (e) {
                console.log(e.message);
            }
        });
    }

    /*
     creates the inventory filed needed by ansible to run playbooks.
     */
    writeInventory(resultObj) {
        return new Promise((resolve, reject)=> {
            try {
                let inventory = resultObj.self.inventory.join("/n/r");
                fs.writeFile(resultObj.self.playbookDir + `/inventory`, inventory, (err)=> {
                    if (err) {
                        logger.logAndAddToErrors("Error creating inventory file for ansible",
                            resultObj.self.errors);
                        reject(err);
                    }
                    if (resultObj.self.errors.length > 0) {
                        reject(resultObj.self.errors);
                    } else {
                        resolve("success");
                    }
                });
            } catch (e) {
                console.log(e.message);
            }
        });
    }

    /*
     Create the ansible javascript object from vincent's javascript host object. The ansible object holds the properties and
     values as defined by ansible modules to be used to generate the yml file on export with writePlaybook().
     */
    loadEngineDefinition(host) {
        this.inventory.push(host.name);
        //needs to be an array to generate correct yml for ansible
        var playbook = [];
        playbook.push({hosts: host.name, tasks: []});
        let tasks = playbook[0].tasks;

        for (let manager in this.provider.managers) {
            if (this.provider.managers[manager] instanceof Manager) {
                if (this.provider.managers[manager] instanceof HostManager) continue;
                this.provider.managers[manager].exportToEngine("ansible", host, tasks);
            }
        }
        ;
        this.playbooks[host.name] = {};
        this.playbooks[host.name].yml = yaml.safeDump(playbook); //cache the generated yml for playbook.
        this.playbooks[host.name].object = playbook; //cache the generated object for playbook.
        return this.playbooks[host.name].yml;
    }

    /*
     Method to retrieve host details using ansible target properties
     */
    getInfo(host) {
        if (host instanceof Host && host.name) {
            var hostname = host.name;
        } else if (typeof host == 'string') {
            hostname = host;
        } else {
            logger.logAndThrow("The host parameter must be of type Host or a host name string.");
        }

        let proc = child_process.exec(`ansible -m setup -i inventory ${hostname}`,
            {cwd: this.playbookDir});
        let promise = new Promise(function (resolve, reject) {
            proc.stdout.on('data', (data)=> {
                resolve(data);
            });
            proc.stderr.on('data', (data)=> {
                reject(data);
            });
        });
        return promise;
    }

    /*
     Run an ansible playbook!
     */
    runPlaybook(host, callback, userPasswd, sudoPasswd) {

        if (host instanceof Host && host.name) {
            var hostname = host.name;
        } else if (typeof host == 'string') {
            hostname = host;
        } else {
            logger.logAndThrow("The host parameter must be of type Host or a host name string.");
        }

        let opts = [`${hostname}.yml`];
        opts.push("-i");
        opts.push("inventory");

        if (userPasswd) {
            opts.push("--ask-pass");
        }

        if (sudoPasswd) {
            opts.push("--ask-become-pass");
        }

        opts.push('--extra-vars');
        opts.push(`"ansible_become_pass=dagama"`);

        let proc = child_process.spawn("ansible-playbook", opts,
            {cwd: this.playbookDir, detached: true});

        proc.stdout.on('data', (data)=> {
            if (data.toString().indexOf("SSH password:") != -1) {
                proc.stdin.write(`${userPasswd}\n`);
            } else if (data.toString().indexOf("SUDO password") != -1) {
                proc.stdin.write(`${sudoPasswd}\n`);
            } else {
                if (data.indexOf("PLAY RECAP") != -1) {
                    callback(data.toString());
                }
            }
        });


        proc.stderr.on('data', (data)=> {
            if (data) {
                if (data.toString().indexOf("SSH password:") != -1) {
                    proc.stdin.write(`${userPasswd}\n`);
                } else if (data.toString().indexOf("SUDO password") != -1) {
                    proc.stdin.write(`${sudoPasswd}\n`);
                }
            }
        });

    }

}

export default AnsibleEngine;