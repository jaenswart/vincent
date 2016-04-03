/**
 * Created by mark on 2016/02/21.
 */
import Provider from "../src/Provider";
import User from "../src/modules/user/User";
import Group from "../src/modules/group/Group";
import {expect} from 'chai';
import fs from 'fs';
import Docker from './support/Docker'
import path from 'path';

describe("ansible engine", () => {
    "use strict";

    var validUsers = [
        new User({name: 'userA', key: 'userA.pub', state: 'present', uid: undefined}),
        new User({name: 'userB', key: undefined, state: 'absent', uid: undefined}),
        new User({name: 'user3', key: 'user3.pub', uid: 1000, state: 'present'}),
        new User({name: 'user4', key: undefined, state: 'present', uid: undefined})
    ];

    var validGroups = [
        new Group({

            name: 'group1',
            gid: undefined,
            state: 'present'
        }),
        new Group({
            name: 'group2',
            gid: undefined,
            state: 'present'
        }),
        new Group({
            name: 'group3',
            gid: 1000,
            state: 'present'
        })
    ];

    var validHosts = [
        {
            name: "www.example.com",
            users: [
                {
                    user: {name: "userA", state: "present"},
                    authorized_keys: [{name: "userA", state: "present"}]
                },
                {
                    user: {name: "userB", state: "absent"},
                    authorized_keys: [{name: "userA", state: "present"}]
                }
            ],
            groups: [
                {
                    group: {name: "group1", state: "present"},
                    members: [
                        "user1"
                    ]
                },
                {
                    group: {name: "group2", state: "present"}
                },
                {
                    group: {name: "group3", state: "present"},
                    members: [
                        "user1"
                    ]
                }

            ]
        }];

    var provider = new Provider();
    var gen = provider.engine;
    //inject mocks
    provider.managers.groupManager.validGroups = validGroups;
    provider.managers.userManager.validUsers = validUsers;
    provider.managers.hostManager.loadHosts(validHosts);
    //make sure directory is empty before running tests.
    it("should have empty directory once clean has been called", (done)=> {
        gen.clean().then(result=> {
            let dir = provider.config.get('confdir') + "/playbooks";
            let files = fs.readdirSync(dir);
            expect(files.length).to.equals(0);
            done();
        }).catch(e=> {
            console.log(e);
            throw new Error(e);
        });
    });


    it("should generate playbook object for host", (done) => {
        gen.loadEngineDefinition(provider.managers.hostManager.find("www.example.com"));
        gen.export().then((result)=> {
            expect(result).to.equal("success");
            let playbookObj = gen.playbooks["www.example.com"];
            expect(playbookObj.object[0].tasks.length).to.equal(6);
            done();
        }).catch(e=> {
            console.log(e);
            throw new Error(e);
        });
    });

    it("should generate playbook files for host", function (done) {
        gen.loadEngineDefinition(provider.managers.hostManager.find("www.example.com"));
        gen.clean().then(result=> {
            gen.export().then((result)=> {
                fs.readdir(gen.playbookDir, (err, files)=> {
                    expect(files.length).to.equal(2);
                    done();
                })
            })
        }).catch(e=> {
            console.log(e);
            throw new Error(e);
        });
    });

    it("should get ansible facts", done=> {
        let docker = new Docker();
        docker.startDocker("vincentsshkeys").then(ipaddr=> {
            return new Promise(resolve=> {
                gen.inventory = [ipaddr];
                gen.writeInventory({self: gen});
                resolve(ipaddr);
            });
        }).then(ipaddr=> {
            let keypath = path.resolve(provider.getRootDir(), "test/docker/sshkeys/vincent.key");
            return gen.getInfo(ipaddr, false, keypath, "vincent")
        }).then((result)=> {
            console.log("got result?");
            return new Promise(resolve=> {
                console.log(result.toString());
                resolve();
            });
        }).then(result => {
            return  new Promise(resolve =>{
                docker.stopDocker();
                resolve() })
        }).then(result=> {
            done();
        }).catch(e=> {
            console.log(e);
        })
    });

});



