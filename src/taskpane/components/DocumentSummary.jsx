import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../@/components/ui/card";

const DocumentSummary = ({ documentSummary }) => (
  <Card>
    <CardHeader>
      <CardTitle>Document Summary</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 leading-relaxed">{documentSummary}</p>
      </div>
    </CardContent>
  </Card>
);

export default DocumentSummary;
