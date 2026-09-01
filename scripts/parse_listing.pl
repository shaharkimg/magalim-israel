#!/usr/bin/perl
use strict; use warnings;
binmode(STDOUT, ":encoding(UTF-8)");
use utf8;

for my $file (@ARGV) {
  open(my $fh, "<:encoding(UTF-8)", $file) or die "cannot open $file";
  local $/;
  my $html = <$fh>;
  close($fh);

  while ($html =~ m{<h2[^>]*>\s*<a[^>]*href="https://www\.tiuli\.com/tracks/(\d+)/[^"]*"[^>]*>([^<]+)</a>}g) {
    my ($id, $name) = ($1, $2);
    my $pos = pos($html);
    my $before = substr($html, $pos > 3000 ? $pos-3000 : 0, 3000);
    my $after = substr($html, $pos, 800);
    my @diffmatches = $before =~ m{<div class="flex-1 truncate[^"]*">\s*([^\s,<]+)\s*,\s*([\d.]+)\s*ק}g;
    my ($diff, $dist) = @diffmatches ? (@diffmatches[-2,-1]) : ("","");
    my ($subregion) = $after =~ m{icon-map-marker[^<]*</span>\s*<span class="mr-1 truncate">([^<]+)</span>};
    $diff //= ""; $dist //= ""; $subregion //= "";
    $name =~ s/^\s+|\s+$//g;
    print "$id|$name|$diff|$dist|$subregion\n";
  }
}
