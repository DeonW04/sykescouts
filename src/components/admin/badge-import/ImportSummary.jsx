import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../../utils';

export default function ImportSummary({ stats }) {
  const { saved = 0, skipped = 0, alreadyExisted = 0 } = stats;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          Import complete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-700">{saved}</p>
            <p className="text-sm text-green-600">Saved</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-600">{skipped}</p>
            <p className="text-sm text-gray-500">Skipped</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{alreadyExisted}</p>
            <p className="text-sm text-blue-500">Already existed</p>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Link to={createPageUrl('AdminSettings') + '?page=manage-badges'}>
            <Button className="bg-[#7413dc] hover:bg-[#5c0fb0]">Go to Manage Badges</Button>
          </Link>
          <Link to={createPageUrl('AdminSettings') + '?page=osm-badge-import'}>
            <Button variant="outline">Import more badges</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}