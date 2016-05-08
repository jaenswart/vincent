'use strict';

import Provider from './../src/Provider';
import {expect} from 'chai';


var groups = {
    "owner": "root",
    "group": "groupadmin",
    "permissions": "660",
    "groups": [
        {name: 'group1'},
        {name: 'group2'},
        {name: 'group2'},
        {name: 'group3', gid: 1000},
        {name: 'group4', gid: 1000},
        {gid:10001}
    ]
};

var users = {
    "owner": "root",
    "group": "useradmin",
    "permissions":"660",
    "users": [
        {name: 'user1', key: 'user1.pub', state: 'present'},
        {name: 'user2', state: 'absent'},
        {name: 'user3', key: 'user3.pub', uid: 1000, state: 'present'},
        {name: 'user4', state: 'absent'},
        {name: 'user5', state: 'deleted'},
        {name: 'user2', state: 'present'},
        {uid: 2000},
        {name: 'user6', state: 'present', uid: 1000}
    ]
};


describe("validating group configuration", function () {
    let provider = new Provider();
    //provider.init();    //inject mocks
    provider.managers.groupManager.loadFromJson(groups);

    it("should detect duplicate group names", function () {
        expect(provider.managers.groupManager.errors.indexOf("Error validating group. Group group2 already exists.")).not.to.equal(-1);
    });

    it("should detect duplicate gids", function () {
        expect(provider.managers.groupManager.errors.indexOf("Error validating group. Group group4 with gid 1000 already exists as group3 with gid 1000.")).not.to.equal(-1);
    });

    it("should detect groups with missing name property", function () {
        expect(provider.managers.groupManager.errors.indexOf("Error validating group. The parameter data must be a group name or an object with a mandatory property \"name\".")).not.to.equal(-1);
    });

    it("should return an array of valid groups", function () {
        var validGroups = {
            owner: "root",
            group: "groupadmin",
            permissions: parseInt(660, 8),
            groups: [
                {
                    name: 'group1',
                    state: 'present'
                },
                {
                    name: 'group2',
                    state: 'present'
                },
                {
                    name: 'group3',
                    gid: 1000,
                    state: 'present'
                }
            ]
        };
        expect(provider.managers.groupManager.export()).to.deep.equal(validGroups);
    });
});

describe("validating user configuration", function () {
    let provider = new Provider();
    //provider.init();    //inject mocks
    provider.managers.userManager.loadFromJson(users);

    it("should detect duplicate user names", function () {
        expect(provider.managers.userManager.errors.indexOf("Error validating user. User user2 already exists.")).not.to.equal(-1);
    });

    it("should detect duplicate uids", function () {
        expect(provider.managers.userManager.errors.indexOf("Error validating user. User user6 already exists with uid 1000.")).not.to.equal(-1);
    });

    it("should detect the creation of user objects with no user name", function () {
        expect(provider.managers.userManager.errors.indexOf("Error validating user. The parameter data must be a user name or an object with a mandatory property \"name\"."))
            .not.to.equal(-1);
    });

    it("should return an array of valid users", function () {
        var validUsers = {
            owner: "root",
            group: "useradmin",
            permissions: "664",
            users: [
                {name: 'user1', key: 'user1.pub', state: 'present', uid: undefined},
                {name: 'user2', key: undefined, state: 'absent', uid: undefined},
                {name: 'user3', key: 'user3.pub', uid: 1000, state: 'present'},
                {name: 'user4', key: undefined, state: 'absent', uid: undefined}
            ]
        };
        expect(provider.managers.userManager.export()).to.deep.equal(validUsers);
    });

});

