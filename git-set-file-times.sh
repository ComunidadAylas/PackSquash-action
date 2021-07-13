#!/usr/bin/perl
use strict;
use warnings;

# sets mtime and atime of files to the latest commit time in git
#
# This is useful for serving static content (managed by git)
# from a cluster of identically configured HTTP servers.  HTTP
# clients and content delivery networks can get consistent
# Last-Modified headers no matter which HTTP server in the
# cluster they hit.  This should improve caching behavior.
#
# This does not take into account merges, but if you're updating
# every machine in the cluster from the same commit (A) to the
# same commit (B), the mtimes will be _consistent_ across all
# machines if not necessarily accurate.
#
# THIS IS NOT INTENDED TO OPTIMIZE BUILD SYSTEMS SUCH AS 'make'
# YOU HAVE BEEN WARNED!

# e.g.
#  * git set-file-times
#  * git set-file-times --since 2020/06/17

my %ls = ();
my $commit_time;
my $prefix = @ARGV && $ARGV[0] =~ s/^--prefix=// ? shift : '';

if ($ENV{GIT_DIR}) {
	chdir($ENV{GIT_DIR}) or die $!;
	chdir("../") or die $!;
}

$/ = "\0";
open FH, 'git ls-files -z|' or die $!;
while (<FH>) {
	chomp;
	$ls{$_} = $_;
}
close FH;

$/ = "\n";
open FH, "git -c diff.renames=false log -m -r --name-only --no-color --pretty=raw -z @ARGV |" or die $!;
while (<FH>) {
	chomp;
	if (/^committer .*? (\d+) (?:[\-\+]\d+)$/) {
		$commit_time = $1;
	} elsif (s/\0\0commit [a-f0-9]{40}( \(from [a-f0-9]{40}\))?$// or s/\0$//) {
		my @files = delete @ls{split(/\0/, $_)};
		@files = grep { defined $_ } @files;
		next unless @files;
		map { s/^/$prefix/ } @files;
		utime $commit_time, $commit_time, @files;
	}
	last unless %ls;
}
close FH;

my $c = scalar keys %ls;
if ($c > 0) {
	print $c, ": Warning: The final commit log for the file was not found.\n";
	utime $commit_time, $commit_time, keys %ls;
}
