var COMMODITIES = [
    {
        "name"   : "BTC USD",
        "country": "US",
        "id"     : "945629"
    },
    {
        "name"   : "IOTA USD",
        "country": "US",
        "id"     : "1031068"
    }
];

function filter(prop, condition){
    return COMMODITIES.filter(function(o){
        return o[prop] == condition;
    });
}

function find(regex, country){
    var commodities = COMMODITIES;
    if(country) commodities = filterByCountry(country);

    return commodities.filter(function(o){
        return o.name.match(regex);
    });
}

function findById(id){
    return COMMODITIES.filter(function(o){
        return o.country == country;
    });
}

module.exports = {

    commodities:  COMMODITIES,
    usOnly: function(){
        return filter('country', 'US');
    },
    ukOnly: function(){
        return filter('country', 'UK');
    },
    get: function(id){
        var o = filter('id', id);
        return o.length != 1 ? undefined : o[0];
    },
    find: find
};