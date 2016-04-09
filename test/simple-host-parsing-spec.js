import Provider from "../src/Provider.js";
import User from "../src/modules/user/User";
import Group from "../src/modules/group/Group";
import {expect} from 'chai';
import Docker from './support/Docker';

describe("validating host configuration", function () {

    var validUsers = [
        new User({name: 'user1', key: 'user1.pub', state: 'present', uid: undefined}),
        new User({name: 'user2', key: undefined, state: 'absent', uid: undefined}),
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

    var hosts = [
        {
            name: "www.example.com",
            users: [
                {
                    user: {name: "user1"},
                    authorized_keys: [{ name:"user1", state: "present"}]
                },
                {
                    user: {name: "user2"},
                    authorized_keys: [
                        { name:"user1", state: "present"},
                        { name:"user2", state: "absent"}
                    ]
                }
            ],
            groups: [
                {
                    group: {name: "group1"},
                    members: [
                        "user1"
                    ]
                },
                {
                    group: {name: "group2"},
                    members: [
                        "user2"
                    ]
                },
                {
                    group: {name: "group3"},
                    members: [
                        "user1",
                        "user2"
                    ]
                }

            ]
        }, {
            users: [
                {
                    user: {name: "user1"}
                }
            ],
            group: [
                {
                    group: {name: "group1"},
                    members: "user1"
                }
            ]
        },
        {
            name: "www.test.com",
            users: [
                {
                    user: {name: "waldo"},
                    authorized_keys: [{name:"user1"}]
                },
                {
                    user: {name: "user2", state: "present"},
                    authorized_keys: [{name:"user1"}]
                },
                {
                    user: {name: "user3"}
                },
                {
                    user: {name: "user4", state: "absent"}
                }
            ],
            groups: [
                {
                    group: {name: "group2"},
                    members: [
                        "user2"
                    ]
                },
                {
                    group: {name: "group3"},
                    members: [
                        "waldo",
                        "user2"
                    ]
                }
            ]
        },
        {
            name: "www.abc.co.za",
            users: [
                {
                    user: {name: "user1"},
                    authorized_keys: [{name:"user1"}, {name:"user3"}, {name:"waldo"}, {name:"user4"}]
                },
                {
                    user: {name: "user2"},
                    authorized_keys: [{name:"user1"}, {name:"user4"}]
                }
            ],
            groups: [
                {
                    group: {name: "group10"},
                    members: [
                        "user2"
                    ]
                },
                {
                    group: {name: "group3"},
                    members: [
                        "waldo",
                        "user2"
                    ]
                }

            ]
        }
    ];

    var provider = new Provider();
    //inject mocks
    provider.managers.groupManager.validGroups = validGroups;
    provider.managers.userManager.validUsers = validUsers;

    provider.managers.hostManager.loadHosts(hosts);

    it("should detect hosts without a name property", function () {
        expect(provider.managers.hostManager.errors.manager.indexOf("Error loading host - The parameter data must be a hostname " +
            "or an object with a mandatory property \"name\".")).not.to.equal(-1);
    });

    it("should detect undefined users", function () {
        expect(provider.managers.hostManager.errors["www.test.com"].indexOf("Error adding host user - The user waldo does not exist " +
            "in valid users.")).not.to.equal(-1);
    });

    it("should detect group members that are undefined for host", function () {
        expect(provider.managers.hostManager.errors["www.test.com"].indexOf("There was an error adding members to the " +
            "group group2. Cannot add member to group. Parameter user with name user2 is not a valid user or user " +
            "is absent.")).not.to.equal(-1);
    });

    it("should detect undefined groups", function () {
        expect(provider.managers.hostManager.errors["www.abc.co.za"].indexOf("Error adding host group - The group group10 does " +
            "not exist in valid groups.")).not.to.equal(-1);
    });

    it("should detect undefined user in users authorized_keys list", function () {
        expect(provider.managers.hostManager.errors["www.abc.co.za"].indexOf("User with name waldo cannot be added as authorized " +
            "user to user1 as the user is invalid.")).not.to.equal(-1);
    });

    it("should detect defined user with missing key in user's authorized_keys list", function () {
        expect(provider.managers.hostManager.errors["www.abc.co.za"].indexOf("There was an error adding an authorised key to the " +
            "user user1. The user user4 is not in validUsers or does not have a " +
            "public key defined")).not.to.equal(-1);
    });

    it("should return an array of valid hosts", function () {
        var validHosts = [
            {
                name: "www.example.com",
                users: [
                    {
                        user: {name: "user1", state: "present" },
                        authorized_keys: [{ name:"user1", state: "present"}]
                    },
                    {
                        user: {name: "user2", state: "absent"},
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
                        group: {name: "group2", state: "present"},
                    },
                    {
                        group: {name: "group3", state: "present"},
                        members: [
                            "user1"
                        ]
                    }

                ]
            },
            {
                name: "www.test.com",
                users: [
                    {
                        user: {name: "user2", state: "absent"},
                    },
                    {
                        user: {name: "user3", state: "present"},
                    },
                    {
                        user: {name: "user4", state: "absent"},
                    }
                ],
                groups: [
                    {
                        group: {name: "group2", state: "present"},
                    },
                    {
                        group: {name: "group3", state: "present"},
                    }
                ]
            },
            {
                name: "www.abc.co.za",
                users: [
                    {
                        user: {name: "user1", state: "present"},
                        authorized_keys: [{name:"user1",state:"present"},
                            {name:"user3", state:"absent",state:"present"}]
                    },
                    {
                        user: {name: "user2", state: "absent"},
                    }
                ],
                groups: [
                    {
                        group: {name: "group3", state: "present"},
                    }

                ]
            }
        ];
        expect(provider.managers.hostManager.export()).to.deep.equal(validHosts);
    });
    
    it("should generate a valid playbook", function (done) {
        let docker = new Docker();
        let running = false;
        var gen = provider.engine;
        this.timeout(15000);
        docker.startDocker("vincentsshpasswd").then(ipaddr=> {
            running = true;
            return new Promise(resolve=> {
                gen.inventory = [ipaddr];
                //update host name to refer to ip address
                provider.managers.hostManager.validHosts[0].name = ipaddr;
                gen.writeInventory({self: gen});
                resolve(ipaddr);
            });
        }).then(ipaddr=> {
            return gen.export();
        }).then((result)=> {
            return new Promise(resolve=> {
                expect(result.includes('ansible_facts')).to.be.true;
                resolve();
            });
        }).then(result => {
            return docker.stopDocker();
        }).then(result=> {
            done();
        }).catch(e=> {
            if (running) {
                docker.stopDocker().then(console.log(e));
            } else {
                console.log(e);
            }
        })
    });
});