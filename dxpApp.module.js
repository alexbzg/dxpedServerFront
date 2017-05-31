angular
    .module( 'dxpApp', [ 'ymaps', 'ngSanitize' ] )
    .factory( 'DataServiceFactory', DataServiceFactory )
    .service( 'Location', Location )
    .service( 'Spots', Spots )
    .service( 'News', News )
    .service( 'Tabs', Tabs )
    .service( 'Log', Log )
    .service( 'Status', Status )
    .controller( 'newsController', newsController )
    .controller( 'spotsController', spotsController )
    .controller( 'mapController', mapController )
    .controller( 'statusController', statusController )
    .controller( 'tabsController', tabsController )
    .controller( 'checkController', checkController )
    .controller( 'logController', logController )
    .controller( 'chatController', chatController )
   ;

function DataController( DataService, interval, $interval ) {
    var vm = this;
    vm.processData = function() {};
    load();
    $interval( load, 60000 );
    
    
    function load() {
        DataService.load()
            .then( function( data ) {
                    if ( data ) {
                        vm.data = data;
                        vm.processData();
                    }
                });
    }


}

function Location( DataServiceFactory ) {
    return DataServiceFactory( "/rda/location.json" );
}

function Spots( DataServiceFactory ) {
    return DataServiceFactory( "/rda/spots.json" );
}

function Status( DataServiceFactory ) {
    return DataServiceFactory( "/rda/status.json" );
}

function Log( DataServiceFactory ) {
    var s = DataServiceFactory( "/rda/qso.json" );
    var empty = true;
    s.lastEntry = lastEntry;
    s.isEmpty = isEmpty;
    s.processData = processData;

    return s;

    function lastEntry() {
        if ( s.data && s.data.length > 0 )
            return s.data[0];
        else
            return null;
    }

    function isEmpty() {
        return empty;
    }

    function processData() {
        empty = ( s.data != null ) && ( s.data.length > 0 );
    }
}

function Tabs() {
    var active = 'map';
    return {
        active: function() { return active; },
        setActive: function(value) { active = value; }
    };
}

function DataServiceFactory( $http ) {
    return createDataService;

    function createDataService( url ) {
        var s = { lm: null,
            load: load,
            data: null,
            url: url,
            processData: function() {} 
        };
        return s;

        function load() {
            return $http.get( s.url )
                .then( loadComplete )
                .catch( loadFailed );
        }

        function loadComplete( response ) {
            if ( ( s.lm == null || s.lm != response.headers( 'last-modified' ) ) && 
                    response.data ) {
                s.lm = response.headers( 'last-modified' ); 
                s.data = response.data;
                s.processData();
                return s.data;
            } else
                return false;
        }

        function loadFailed( error ) {
            console.log( s.url + ' XHR failed: ' + error.data );
        }
    }
}

function News( DataServiceFactory ) {
    return DataServiceFactory(  "/rda/news.json" );
}

function newsController( News, $interval ) {
    DataController.call( this, News, 60000, $interval );
    return this;
}

function tabsController( Tabs ) {
    var vm = this;
    vm.active = Tabs.active;
    vm.setActive = Tabs.setActive;
    return vm;
}

function logController( Log, $interval ) {
    DataController.call( this, Log, 60000, $interval );
    var vm = this;
    vm.lastLogEntry = Log.lastEntry;
    return vm;
}

function statusController( Log ) {
    var vm = this;
    vm.lastLogEntry = Log.lastEntry;
    vm.logEmpty = Log.isEmpty;
    return vm;
}


function chatController() {
    var vm = this;
    return vm;
}

function checkController( Log ) {
    var vm = this;
    vm.check = check;
    return vm;

    function check() {
        if ( Log.data ) {
            vm.found = Log.data.filter( function( item ) {
                return item.cs == vm.cs; 
            });
            if ( vm.found.length == 0 )
                vm.found = false;
        } else
            vm.found = false;
    }

}


function spotsController( Spots, $interval ) {
    DataController.call( this, Spots, 60000, $interval );
    return this;
}

function mapController( Location, $interval ) {
    DataController.call( this, Location, 60000, $interval );
    var vm = this;

    vm.data = { location: [ 40, 50 ] };
    vm.zoom = 11;

    return vm;
}

